"""
Asesor de Infraestructura IA — Fast-IT / NADILOP
Consultor de preventa técnico powered by GPT-4o
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import settings
from app.database import get_db
from app.models.product import Product

router = APIRouter(prefix="/api/advisor", tags=["AI Advisor"])

# ─── Herramientas para el flujo de preguntas ─────────────────────────────────

QUESTION_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "hacer_pregunta",
            "description": "Formula la siguiente pregunta diagnóstica con exactamente 4 opciones de respuesta. Úsala cuando necesites más información antes de recomendar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pregunta": {
                        "type": "string",
                        "description": "La pregunta en español, directa y concreta, máximo 20 palabras"
                    },
                    "opciones": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Exactamente 4 opciones concretas, en español, sin superposición, de menor a mayor escala"
                    }
                },
                "required": ["pregunta", "opciones"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "entregar_recomendacion",
            "description": "Cuando tienes suficiente información (carga de trabajo, escala, presupuesto aproximado y crecimiento), recomienda productos del catálogo.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "IDs de los productos recomendados del catálogo"
                    },
                    "resumen": {
                        "type": "string",
                        "description": "Resumen en español de por qué estos productos son los indicados (2-3 oraciones)"
                    },
                    "justificacion": {
                        "type": "string",
                        "description": "Justificación técnica detallada en español"
                    },
                    "sobredimensionado": {
                        "type": "boolean",
                        "description": "True si el cliente está comprando más de lo que necesita"
                    },
                    "alternative_product_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "IDs de alternativa más económica (solo si sobredimensionado=true)"
                    }
                },
                "required": ["product_ids", "resumen", "justificacion"]
            }
        }
    }
]

QUESTION_SYSTEM_PROMPT = """Eres el Asesor de Infraestructura de Fast-IT.
Tu misión: diagnosticar la necesidad de hardware del cliente y recomendar el producto correcto.

PROCESO:
1. Formula preguntas diagnósticas una a la vez usando la herramienta hacer_pregunta.
2. Adapta cada pregunta según las respuestas anteriores.
3. Cuando conozcas carga de trabajo, escala, presupuesto aproximado y crecimiento esperado → usa entregar_recomendacion.

REGLAS DE PREGUNTAS:
- Siempre en español, concretas (máximo 20 palabras)
- Las 4 opciones deben ser específicas y cubrir el rango completo sin superposición
- Adapta las preguntas al contexto (si dijo "menos de 10 VMs", no preguntes por escala masiva)
- No repitas temas ya respondidos
- Mínimo 3 preguntas, máximo 5

HONESTIDAD TÉCNICA:
- Si el cliente está sobredimensionando su compra, márcalo e incluye alternativa económica
- Solo recomienda lo que existe en el catálogo

CATÁLOGO DISPONIBLE (solo recomienda de aquí):
{catalog_context}

Categoría del cliente: {category}

IMPORTANTE: SIEMPRE usa una de las dos herramientas. Nunca respondas con texto libre."""


class AnswerItem(BaseModel):
    question: str
    options:  list[str] = []
    answer:   str


class QuestionRequest(BaseModel):
    category: str
    answers:  list[AnswerItem] = []

# ─── Herramientas disponibles para GPT ───────────────────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_catalog",
            "description": (
                "Consulta el catálogo de Fast-IT para ver productos disponibles. "
                "Úsala cuando necesites verificar stock, precios o compatibilidad de hardware."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["servers", "storage", "networking", "accessories"],
                        "description": "Categoría de hardware a consultar"
                    },
                    "max_price_clp": {
                        "type": "number",
                        "description": "Precio máximo en CLP (opcional)"
                    },
                    "brand": {
                        "type": "string",
                        "description": "Filtrar por marca (HPE, Cisco, Dell, NetApp...)"
                    }
                },
                "required": ["category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "finish_recommendation",
            "description": (
                "Llama esta herramienta cuando tengas suficiente información para "
                "hacer una recomendación técnica completa. Solo úsala cuando estés seguro."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "product_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "IDs de los productos recomendados (primario + accesorios)"
                    },
                    "summary": {
                        "type": "string",
                        "description": "Resumen ejecutivo de la recomendación (2-3 oraciones)"
                    },
                    "justification": {
                        "type": "string",
                        "description": "Justificación técnica detallada"
                    },
                    "is_overprovisioned": {
                        "type": "boolean",
                        "description": "True si el cliente está sobredimensionando su compra"
                    },
                    "alternative_product_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "IDs de alternativa más económica (si is_overprovisioned=true)"
                    }
                },
                "required": ["product_ids", "summary", "justification"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "escalate_to_human",
            "description": (
                "Deriva al cliente a un nuestro equipo cuando el proyecto "
                "supera la escala normal: más de 5 servidores, presupuesto >$50.000 USD, "
                "arquitecturas híbridas complejas o requerimientos personalizados."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {
                        "type": "string",
                        "description": "Motivo de la derivación"
                    },
                    "estimated_value_usd": {
                        "type": "number",
                        "description": "Valor estimado del proyecto en USD"
                    }
                },
                "required": ["reason"]
            }
        }
    }
]

# ─── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Eres el Asesor de Infraestructura de Fast-IT, plataforma B2B.
Actúas como consultor de preventa técnico senior especializado en servidores, storage y networking.

IDENTIDAD:
- Nombre: Asesor Fast-IT
- Tono: experto y técnico, pero claro y cercano. Sin jerga innecesaria.
- Objetivo: encontrar la solución CORRECTA, no la más cara.

FLUJO DE DIAGNÓSTICO:
1. Si el cliente menciona un modelo o SKU específico → usa get_catalog de inmediato para verificar stock y precio.
2. Si el cliente describe una necesidad → diagnostica con preguntas (máximo 2-3 por mensaje):
   • Carga de trabajo: ¿Virtualización (VMware/Proxmox/Hyper-V)? ¿Base de datos? ¿Storage/NAS? ¿IA/ML?
   • Dimensionamiento: ¿Cuántos usuarios concurrentes? ¿Cuántas VMs? ¿Volumen de datos?
   • Crecimiento: ¿Proyección a 3-5 años?
   • Infraestructura existente: ¿Qué tienen actualmente? ¿Hay rack disponible?
   • Presupuesto: Rango aproximado en CLP o USD.

HONESTIDAD TÉCNICA (diferenciador clave):
- Si el hardware supera claramente la necesidad descrita → DEBES informarlo siempre.
- Presenta dos opciones:
  a) La solución óptima para la necesidad actual (más económica)
  b) La solución premium con argumento de future-proofing (escalabilidad sin cambiar chasis)
- Ejemplo: "Para tus 5 VMs el DL20 cubre la necesidad y te ahorra $2M CLP. El DL380 tiene sentido si planeas escalar a 30+ VMs en 2 años."

COMPATIBILIDAD TÉCNICA (obligatorio antes de recomendar combos):
- Antes de combinar varios productos en una recomendación, verifica que sean técnicamente compatibles
  consultando los specs (Form Factor, fuente requerida, Layer de red, redundancia, RAM máx, GPU, etc.).
- Reglas mínimas:
  • Servidor + switch: el switch debe tener Layer y Ports adecuados al uplink del servidor (ej: 1GbE/10GbE/SFP+).
  • Servidor 2U + rack: confirma que el rack tenga U disponibles y la fuente coincida (Hot-plug Platinum, etc.).
  • Storage SAN/SAS + servidor: el servidor debe tener HBA o controladora compatible con el protocolo del storage (SAS/iSCSI/FC).
  • Workstation + GPU: revisa Power Supply suficiente y slots PCIe compatibles.
- Si no hay specs suficientes en el contexto, llama get_catalog para obtenerlas antes de recomendar.
- Si detectas una incompatibilidad, NO la propongas: explica el problema y ofrece alternativa válida.

HEALTH-CHECK (antes de cerrar siempre):
- Pregunta: "¿Tienes UPS, rack y cableado para este equipo?"
- Si no tiene → usa get_catalog con category="accessories" para ofrecer lo disponible.
- Si no hay stock → indica que es bajo pedido.

ESCALACIÓN A SOPORTE FAST-IT:
- Triggers: más de 5 servidores, presupuesto estimado >$50.000 USD, arquitecturas multi-site, requerimientos de SLA crítico.
- Al escalar: "Este proyecto requiere atención personalizada. Nuestro equipo te contactará en menos de 24 horas."

CATÁLOGO ACTUAL:
{catalog_context}

REGLAS FINALES:
- Responde SIEMPRE en español
- Máximo 2-3 preguntas por mensaje, nunca más
- Cuando tengas suficiente info → llama finish_recommendation
- Si ya hiciste el health-check de accesorios → puedes cerrar con finish_recommendation
- Sé conciso: párrafos cortos, bullet points cuando aplique
- No inventes productos fuera del catálogo actual
"""

# ─── Helpers ─────────────────────────────────────────────────────────────────

# Specs clave usadas para validar compatibilidad (form factor, fuente, layer, RAM, etc.)
_KEY_SPEC_FIELDS = (
    "Form Factor", "Factor de forma",
    "Power Supply", "Power supply", "Power supply type", "Fuente", "Fuente de alimentación",
    "Layer", "Capa",
    "Ports", "Puertos",
    "PoE", "PoE Budget", "Presupuesto PoE",
    "Max RAM", "Memoria RAM", "Memory", "RAM máxima",
    "GPU Slots", "GPU", "Ranuras GPU",
    "Processor", "Procesador",
    "Storage Bays", "Bahías de almacenamiento",
    "Uplinks", "Enlaces ascendentes",
    "Switching capacity", "Switching Capacity", "Capacidad de conmutación",
    "Interface", "Interfaz",
    "Protocol", "Protocolo",
    "Type", "Tipo",
    "Almacenamiento", "Red", "Controladores", "Bahías de discos",
)


def _summarise_specs(specs: Optional[dict]) -> str:
    """
    Devuelve los specs clave en formato compacto: 'k1=v1; k2=v2'.
    El asesor IA usa esto para verificar compatibilidad sin pedir get_catalog
    para cada combo.
    """
    if not specs or not isinstance(specs, dict):
        return ""
    pairs = []
    for key in _KEY_SPEC_FIELDS:
        if key in specs and specs[key]:
            pairs.append(f"{key}={specs[key]}")
    return "; ".join(pairs[:6])  # limitamos para no saturar el contexto


def _build_catalog_context(db: Session) -> str:
    products = db.query(Product).all()
    if not products:
        return "Catálogo vacío."
    lines = []
    for p in products:
        spec_summary = _summarise_specs(p.technical_specs)
        line = (
            f"ID:{p.id} | SKU:{p.sku} | {p.name} | {p.brand} | "
            f"Categoría:{p.category} | Stock:{p.stock_status.value} | "
            f"Precio:{int(p.public_price):,} CLP"
        )
        if spec_summary:
            line += f" | Specs:{spec_summary}"
        lines.append(line)
    return "\n".join(lines)


def _execute_get_catalog(args: dict, db: Session) -> dict:
    q = db.query(Product).filter(Product.category == args["category"])
    if args.get("brand"):
        q = q.filter(Product.brand.ilike(f"%{args['brand']}%"))
    if args.get("max_price_clp"):
        q = q.filter(Product.public_price <= args["max_price_clp"])
    products = q.all()
    return {
        "products": [
            {
                "id": p.id, "sku": p.sku, "name": p.name, "brand": p.brand,
                "stock": p.stock_status.value, "price_clp": int(p.public_price),
                "specs": p.technical_specs,
            }
            for p in products
        ]
    }


def _execute_finish_recommendation(args: dict, db: Session):
    ids = args.get("product_ids", [])
    alt_ids = args.get("alternative_product_ids", [])

    def fetch(id_list):
        if not id_list:
            return []
        products = db.query(Product).filter(Product.id.in_(id_list)).all()
        return [
            {
                "id": p.id, "sku": p.sku, "name": p.name, "brand": p.brand,
                "stock": p.stock_status.value, "price_clp": int(p.public_price),
                "category": p.category, "specs": p.technical_specs,
                "public_price": float(p.public_price),
            }
            for p in products
        ]

    recommendation = {
        "products":              fetch(ids),
        "alternative_products":  fetch(alt_ids),
        "summary":               args.get("summary", ""),
        "justification":         args.get("justification", ""),
        "is_overprovisioned":    args.get("is_overprovisioned", False),
    }
    return {"status": "recommendation_ready"}, recommendation


# ─── Schemas ─────────────────────────────────────────────────────────────────

class Message(BaseModel):
    role:    str
    content: str

class AdvisorChatRequest(BaseModel):
    category: str
    messages: list[Message]

# ─── Endpoint ────────────────────────────────────────────────────────────────

@router.post("/chat")
def advisor_chat(payload: AdvisorChatRequest, db: Session = Depends(get_db)):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY no configurada. Agrega la variable en back/.env"
        )

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
    except ImportError:
        raise HTTPException(status_code=503, detail="Paquete openai no instalado.")

    catalog_context = _build_catalog_context(db)
    system_content  = SYSTEM_PROMPT.replace("{catalog_context}", catalog_context)

    messages = [{"role": "system", "content": system_content}]
    messages += [{"role": m.role, "content": m.content} for m in payload.messages]

    recommendation = None
    escalated      = False

    # ── Primera llamada a GPT ────────────────────────────────────────────────
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
        max_tokens=900,
        temperature=0.65,
    )

    msg = response.choices[0].message

    # ── Manejo de tool calls ─────────────────────────────────────────────────
    if msg.tool_calls:
        tool_results = []

        for tc in msg.tool_calls:
            name = tc.function.name
            args = json.loads(tc.function.arguments)

            if name == "get_catalog":
                result = _execute_get_catalog(args, db)
            elif name == "finish_recommendation":
                result, recommendation = _execute_finish_recommendation(args, db)
            elif name == "escalate_to_human":
                escalated = True
                result = {
                    "status": "escalated",
                    "message": "Derivación registrada. Fast-IT contactará en <24h.",
                    "threshold_usd": settings.NADILOP_ESCALATION_THRESHOLD_USD,
                }
            else:
                result = {"error": "tool desconocida"}

            tool_results.append({"tool_call_id": tc.id, "content": json.dumps(result)})

        # Reconstruir historial con el tool call y sus resultados
        assistant_msg = {
            "role": "assistant",
            "content": msg.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in msg.tool_calls
            ],
        }
        messages.append(assistant_msg)
        for tr in tool_results:
            messages.append({"role": "tool", "tool_call_id": tr["tool_call_id"], "content": tr["content"]})

        # Segunda llamada para que GPT genere la respuesta natural
        final = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            max_tokens=900,
            temperature=0.65,
        )
        content = final.choices[0].message.content
    else:
        content = msg.content

    return {
        "message":        content,
        "recommendation": recommendation,
        "escalated":      escalated,
    }


# ─── Nuevo endpoint: flujo de preguntas con slides ────────────────────────────

@router.post("/question")
def advisor_question(payload: QuestionRequest, db: Session = Depends(get_db)):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY no configurada en back/.env")

    from openai import OpenAI
    oai = OpenAI(api_key=settings.OPENAI_API_KEY)

    catalog  = _build_catalog_context(db)
    system   = QUESTION_SYSTEM_PROMPT.format(
        catalog_context=catalog,
        category=payload.category,
    )

    if payload.answers:
        history_text = "\n".join(
            f"P: {a.question}\nR: {a.answer}" for a in payload.answers
        )
        user_msg = f"Historial de respuestas del cliente:\n{history_text}\n\nContinúa el diagnóstico."
    else:
        user_msg = "Inicia el diagnóstico con la primera pregunta."

    response = oai.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user_msg},
        ],
        tools=QUESTION_TOOLS,
        tool_choice="required",
        max_tokens=400,
        temperature=0.4,
    )

    tc   = response.choices[0].message.tool_calls[0]
    name = tc.function.name
    args = json.loads(tc.function.arguments)

    if name == "hacer_pregunta":
        return {
            "terminado": False,
            "pregunta":  args["pregunta"],
            "opciones":  args["opciones"][:4],
        }

    if name == "entregar_recomendacion":
        def fetch_with_stock(ids):
            if not ids:
                return []
            return [
                {
                    "id": p.id, "sku": p.sku, "name": p.name, "brand": p.brand,
                    "stock": p.stock_status.value, "price_clp": int(p.public_price),
                    "category": p.category, "specs": p.technical_specs,
                    "public_price": float(p.public_price),
                }
                for p in db.query(Product).filter(Product.id.in_(ids)).all()
                if p.stock_status.value != "out_of_stock"  # filtra sin stock
            ]

        return {
            "terminado": True,
            "recomendacion": {
                "productos":             fetch_with_stock(args.get("product_ids", [])),
                "productos_alternativos": fetch_with_stock(args.get("alternative_product_ids", [])),
                "resumen":               args.get("resumen", ""),
                "justificacion":         args.get("justificacion", ""),
                "sobredimensionado":     args.get("sobredimensionado", False),
            },
        }

    raise HTTPException(status_code=500, detail=f"Herramienta desconocida: {name}")

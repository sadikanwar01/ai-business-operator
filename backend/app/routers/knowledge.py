"""Knowledge base endpoints - the persistent business context for the AI."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..db import query, query_one
from ..deps import Session, get_session
from ..repository import knowledge_map, now

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

CATEGORIES = {
    "profile": "Business Profile",
    "services": "Services",
    "audiences": "Ideal Customers",
    "style": "Communication Style",
    "note": "Operating Notes",
}


class KnowledgeItem(BaseModel):
    category: str = Field(min_length=2, max_length=40)
    title: str = Field(min_length=1, max_length=120)
    content: str = Field(min_length=1, max_length=800)


@router.get("")
def get_knowledge(session: Session = Depends(get_session)):
    grouped = knowledge_map(session.workspace_id)
    categories = []
    for key, label in CATEGORIES.items():
        items = grouped.get(key, [])
        categories.append({"key": key, "label": label, "items": items})
    return {"categories": categories}


@router.post("", status_code=status.HTTP_201_CREATED)
def add_item(payload: KnowledgeItem, session: Session = Depends(get_session)):
    from ..security import new_id

    stamp = now()
    item_id = new_id("knw")
    order = query_one(
        "SELECT COALESCE(MAX(order_index), -1) + 1 AS n FROM knowledge_items WHERE workspace_id = ? AND category = ?",
        (session.workspace_id, payload.category),
    )["n"]
    from ..db import execute

    execute(
        """INSERT INTO knowledge_items (id, workspace_id, category, key, title, content, order_index,
               created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)""",
        (item_id, session.workspace_id, payload.category, payload.category.lower(), payload.title,
         payload.content, order, stamp, stamp),
    )
    return {"item": query_one("SELECT * FROM knowledge_items WHERE id = ?", (item_id,))}


class KnowledgeUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=120)
    content: str | None = Field(default=None, max_length=800)
    category: str | None = Field(default=None, max_length=40)


@router.patch("/{item_id}")
def update_item(item_id: str, payload: KnowledgeUpdate, session: Session = Depends(get_session)):
    from ..db import execute

    item = query_one(
        "SELECT * FROM knowledge_items WHERE id = ? AND workspace_id = ?",
        (item_id, session.workspace_id),
    )
    if not item:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Item not found."})
    execute(
        """UPDATE knowledge_items SET title = ?, content = ?, category = ?, updated_at = ?
           WHERE id = ?""",
        (
            payload.title if payload.title is not None else item["title"],
            payload.content if payload.content is not None else item["content"],
            payload.category if payload.category is not None else item["category"],
            now(),
            item_id,
        ),
    )
    return {"item": query_one("SELECT * FROM knowledge_items WHERE id = ?", (item_id,))}


@router.delete("/{item_id}")
def delete_item(item_id: str, session: Session = Depends(get_session)):
    from ..db import execute

    execute(
        "DELETE FROM knowledge_items WHERE id = ? AND workspace_id = ?",
        (item_id, session.workspace_id),
    )
    return {"deleted": item_id}

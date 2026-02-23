from typing import Dict, List

from app.services.openai_service import answer_query, generate_embedding
from app.services.supabase_service import search_entries_by_embedding


async def query_entries(user_id: str, question: str) -> Dict:
    """Full RAG pipeline: embed question → vector search → GPT-4o answer.

    Returns:
        dict with keys: answer (str), sources (List[Dict]), has_data (bool)
    """
    # Step 1: Embed the user's question
    question_embedding = await generate_embedding(question)

    # Step 2: Vector search for relevant entries
    relevant_entries = await search_entries_by_embedding(
        user_id=user_id,
        embedding=question_embedding,
        match_count=10,
    )

    if not relevant_entries:
        return {
            "answer": "I don't have enough logged data to answer that question yet. Keep logging and ask me again later!",
            "sources": [],
            "has_data": False,
        }

    # Step 3: Generate answer grounded in retrieved entries
    answer = await answer_query(question, relevant_entries)

    return {
        "answer": answer,
        "sources": relevant_entries,
        "has_data": True,
    }

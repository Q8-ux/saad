from __future__ import annotations

from typing import Literal

import chess
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .engine import PIECE_VALUES, choose_move

router = APIRouter(prefix="/api", tags=["coach"])


class CoachRequest(BaseModel):
    fen: str = Field(max_length=120)
    language: Literal["ar", "en", "ur"] = "ar"


TEXT = {
    "ar": {
        "summary": "لديك {count} نقلة قانونية. الاقتراح المدروس هو {san}.",
        "check": "الأولوية الآن: أخرج الملك من الكش مع الحفاظ على القطع.",
        "capture": "توجد فرصة أخذ قانونية؛ قارن قيمة القطعة المأخوذة بما قد تخسره بعدها.",
        "checking": "النقلة المقترحة تعطي كشاً وتفرض على الخصم رداً مباشراً.",
        "castle": "التبييت يحسن أمان الملك ويقرّب الرخ من اللعب.",
        "opening": "طوّر القطع الخفيفة، حافظ على الوسط، ولا تحرك القطعة نفسها بلا حاجة.",
        "ahead": "أنت متقدم مادياً؛ بسّط الوضع وتجنب المخاطرة غير الضرورية.",
        "behind": "أنت متأخر مادياً؛ ابحث عن نشاط وتكتيك قبل تبديل القطع.",
        "balanced": "الوضع المادي متقارب؛ حسّن تمركز أسوأ قطعة لديك.",
        "material_ahead": "متقدم",
        "material_behind": "متأخر",
        "material_equal": "متوازن",
    },
    "en": {
        "summary": "You have {count} legal moves. The validated suggestion is {san}.",
        "check": "Priority: get the king out of check while preserving your pieces.",
        "capture": "A legal capture is available; compare what you win with what may be lost next.",
        "checking": "The suggested move gives check and forces an immediate reply.",
        "castle": "Castling improves king safety and brings a rook closer to play.",
        "opening": "Develop minor pieces, contest the centre, and avoid moving one piece repeatedly.",
        "ahead": "You are ahead in material; simplify and avoid unnecessary risk.",
        "behind": "You are behind in material; seek activity and tactics before trading pieces.",
        "balanced": "Material is balanced; improve the position of your least active piece.",
        "material_ahead": "Ahead",
        "material_behind": "Behind",
        "material_equal": "Balanced",
    },
    "ur": {
        "summary": "آپ کے پاس {count} قانونی چالیں ہیں۔ تصدیق شدہ تجویز {san} ہے۔",
        "check": "پہلی ترجیح: مہروں کو بچاتے ہوئے بادشاہ کو شہ سے نکالیں۔",
        "capture": "قانونی مہرہ پکڑنے کا موقع ہے؛ اگلی چال میں ممکنہ نقصان بھی دیکھیں۔",
        "checking": "تجویز کردہ چال شہ دیتی ہے اور حریف کو فوری جواب پر مجبور کرتی ہے۔",
        "castle": "کیسلنگ بادشاہ کو محفوظ اور رخ کو کھیل کے قریب کرتی ہے۔",
        "opening": "ہلکے مہرے تیار کریں، مرکز پر قابو رکھیں، اور ایک مہرہ بار بار نہ چلائیں۔",
        "ahead": "آپ مادی طور پر آگے ہیں؛ کھیل سادہ رکھیں اور غیر ضروری خطرہ نہ لیں۔",
        "behind": "آپ مادی طور پر پیچھے ہیں؛ مہروں کے تبادلے سے پہلے سرگرمی اور حکمت عملی تلاش کریں۔",
        "balanced": "مادی حالت برابر ہے؛ اپنے کم فعال مہرے کی جگہ بہتر کریں۔",
        "material_ahead": "آگے",
        "material_behind": "پیچھے",
        "material_equal": "برابر",
    },
}


def _material_balance(board: chess.Board) -> int:
    return sum(
        (len(board.pieces(piece_type, chess.WHITE)) - len(board.pieces(piece_type, chess.BLACK)))
        * value
        for piece_type, value in PIECE_VALUES.items()
        if piece_type != chess.KING
    )


def _material_label(balance: int, turn: chess.Color, text: dict[str, str]) -> str:
    perspective = balance if turn == chess.WHITE else -balance
    if perspective >= 100:
        return text["material_ahead"]
    if perspective <= -100:
        return text["material_behind"]
    return text["material_equal"]


def _plans(
    board: chess.Board,
    move: chess.Move,
    balance: int,
    text: dict[str, str],
) -> list[str]:
    plans: list[str] = []
    if board.is_check():
        plans.append(text["check"])
    if board.is_capture(move):
        plans.append(text["capture"])
    if board.is_castling(move):
        plans.append(text["castle"])

    board.push(move)
    gives_check = board.is_check()
    board.pop()
    if gives_check:
        plans.append(text["checking"])

    if board.fullmove_number <= 10:
        plans.append(text["opening"])

    perspective = balance if board.turn == chess.WHITE else -balance
    if perspective >= 100:
        plans.append(text["ahead"])
    elif perspective <= -100:
        plans.append(text["behind"])
    else:
        plans.append(text["balanced"])

    # Keep the coach compact and deterministic for the game UI.
    return list(dict.fromkeys(plans))[:3]


@router.post("/coach")
def coach_position(request: CoachRequest):
    try:
        board = chess.Board(request.fen)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid position") from exc
    if not board.is_valid():
        raise HTTPException(status_code=400, detail="Invalid position")
    if board.is_game_over(claim_draw=True):
        raise HTTPException(status_code=409, detail="Game is already over")

    suggestion = choose_move(board, "advanced")
    if not suggestion:
        raise HTTPException(status_code=409, detail="No legal move available")
    move = chess.Move.from_uci(suggestion.uci)
    if move not in board.legal_moves:
        raise HTTPException(status_code=500, detail="Coach validation failed")

    text = TEXT[request.language]
    balance = _material_balance(board)
    return {
        "summary": text["summary"].format(
            count=board.legal_moves.count(), san=suggestion.san
        ),
        "plans": _plans(board, move, balance, text),
        "recommended_move": {
            "uci": suggestion.uci,
            "san": suggestion.san,
            "from_square": chess.square_name(move.from_square),
            "to_square": chess.square_name(move.to_square),
        },
        "position": {
            "turn": "white" if board.turn == chess.WHITE else "black",
            "in_check": board.is_check(),
            "legal_moves": board.legal_moves.count(),
            "material": _material_label(balance, board.turn, text),
        },
        "source": "validated_rules_engine",
    }

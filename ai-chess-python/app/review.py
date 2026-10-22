from __future__ import annotations

from typing import Literal

import chess
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .engine import evaluate

router = APIRouter(prefix="/api", tags=["learning"])


class MoveReviewRequest(BaseModel):
    fen: str = Field(max_length=120)
    uci: str = Field(min_length=4, max_length=5)
    language: Literal["ar", "en", "ur"] = "ar"


TEXT = {
    "ar": {
        "best": ("ممتازة", "نقلتك تطابق اختيار المحرك لهذا الموقف."),
        "good": ("جيدة", "نقلة سليمة وتحافظ على توازن موقفك."),
        "inaccuracy": ("تحتاج دقة", "النقلة قانونية، لكن كان هناك خيار أقوى."),
        "mistake": ("تحتاج مراجعة", "النقلة قانونية، لكنها تمنح الخصم فرصة أفضل."),
        "capture": "أخذت قطعة للخصم.",
        "check": "وضعت ملك الخصم في كش.",
        "castle": "حسّنت أمان الملك بالتبييت.",
        "develop": "طوّرت قطعة خفيفة باتجاه اللعب.",
        "quiet": "راقب رد الخصم قبل تنفيذ خطتك التالية.",
    },
    "en": {
        "best": ("Excellent", "Your move matches the engine choice for this position."),
        "good": ("Good", "A sound move that keeps your position balanced."),
        "inaccuracy": ("Needs precision", "The move is legal, but a stronger option was available."),
        "mistake": ("Review it", "The move is legal, but it gives the opponent a better chance."),
        "capture": "You captured an opponent piece.",
        "check": "You put the opponent king in check.",
        "castle": "You improved king safety by castling.",
        "develop": "You developed a minor piece toward the game.",
        "quiet": "Watch the opponent's reply before choosing your next plan.",
    },
    "ur": {
        "best": ("بہترین", "آپ کی چال اس پوزیشن میں انجن کے انتخاب سے ملتی ہے۔"),
        "good": ("اچھی", "یہ مضبوط چال آپ کی پوزیشن کا توازن قائم رکھتی ہے۔"),
        "inaccuracy": ("مزید درستگی", "چال قانونی ہے، لیکن ایک بہتر انتخاب موجود تھا۔"),
        "mistake": ("دوبارہ دیکھیں", "چال قانونی ہے، مگر حریف کو بہتر موقع دیتی ہے۔"),
        "capture": "آپ نے حریف کا مہرہ لیا۔",
        "check": "آپ نے حریف کے بادشاہ کو شہ دی۔",
        "castle": "کیسلنگ سے بادشاہ کی حفاظت بہتر ہوئی۔",
        "develop": "آپ نے ایک ہلکا مہرہ کھیل میں آگے بڑھایا۔",
        "quiet": "اگلی منصوبہ بندی سے پہلے حریف کا جواب دیکھیں۔",
    },
}


def _score(board: chess.Board, move: chess.Move) -> int:
    board.push(move)
    score = evaluate(board)
    board.pop()
    return score


@router.post("/review")
def review_move(request: MoveReviewRequest):
    try:
        board = chess.Board(request.fen)
        move = chess.Move.from_uci(request.uci)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid position or move") from exc
    if not board.is_valid() or move not in board.legal_moves:
        raise HTTPException(status_code=400, detail="Move is not legal in this position")

    legal_moves = list(board.legal_moves)
    maximizing = board.turn == chess.WHITE
    scored = [(candidate, _score(board, candidate)) for candidate in legal_moves]
    best_move, best_score = (max(scored, key=lambda item: item[1]) if maximizing else min(scored, key=lambda item: item[1]))
    played_score = _score(board, move)
    loss = max(0, best_score - played_score) if maximizing else max(0, played_score - best_score)
    grade = "best" if loss == 0 else "good" if loss <= 60 else "inaccuracy" if loss <= 180 else "mistake"

    text = TEXT[request.language]
    played_san = board.san(move)
    best_san = board.san(best_move)
    capture = board.is_capture(move)
    castle = board.is_castling(move)
    piece = board.piece_at(move.from_square)
    developed = bool(piece and piece.piece_type in (chess.KNIGHT, chess.BISHOP) and chess.square_rank(move.from_square) in (0, 7))
    board.push(move)
    gives_check = board.is_check()

    facts = []
    if capture:
        facts.append(text["capture"])
    if gives_check:
        facts.append(text["check"])
    if castle:
        facts.append(text["castle"])
    if developed:
        facts.append(text["develop"])
    if not facts:
        facts.append(text["quiet"])

    label, summary = text[grade]
    return {
        "grade": grade,
        "label": label,
        "summary": summary,
        "fact": facts[0],
        "played": {"uci": move.uci(), "san": played_san},
        "engine_choice": {"uci": best_move.uci(), "san": best_san},
        "source": "validated_rules_engine",
    }

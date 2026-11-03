"""What Qwen3-8B-Base expects after "Standard", for the hero: its five likeliest next tokens, the
two tokens of our name (" Log", then "its") with their probabilities and ranks, and a sample of the
tokens ranked between the two, which the hero's intro runs through on its way to the name. Writes
src/lib/standard.json, which the hero reads; every token and number the hero shows comes from it.

Needs torch and transformers, and the model, loaded in float32 (about 33 GB): in bfloat16 the logits
near 27 are rounded to steps of 0.125, which ties tokens that differ and moves the smaller
probabilities from one device to the next. Runs on CUDA, Apple's MPS or the CPU, whichever is there.
Rerun it only when the model or the prompt changes, and commit its output.

    python scripts/site/standard.py
"""

import json
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL = "Qwen/Qwen3-8B-Base"
PROMPT = "Standard"
NAME = " Logits"
TOP = 5
PASSED = 32
OUT = Path(__file__).resolve().parents[2] / "src/lib/standard.json"


def drawable(text: str) -> bool:
    """A token the title can set in its face on one line: Latin, at most ten characters, not blank."""
    return 0 < len(text) <= 10 and text.strip() != "" and "  " not in text and all(0x20 <= ord(c) <= 0x24F for c in text)


def passed(order: list[int], last: int, decode, entry) -> list[dict]:
    """PASSED drawable tokens from rank TOP + 1 to `last`, at ranks spaced evenly on a log scale, so
    the intro passes the near ones one by one and the far ones in big strides."""
    picks, at = [], TOP
    for k in range(PASSED):
        target = (TOP + 1) * (last / (TOP + 1)) ** (k / (PASSED - 1))
        at = max(at, round(target) - 1)
        while at < last and not drawable(decode(order[at])):
            at += 1
        if at >= last:
            break
        picks.append(entry(order[at]))
        at += 1
    return picks


def main() -> None:
    device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
    tok = AutoTokenizer.from_pretrained(MODEL)
    model = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.float32, device_map=device).eval()

    prompt = tok(PROMPT)["input_ids"]
    named = tok(PROMPT + NAME)["input_ids"]
    assert named[: len(prompt)] == prompt, "the name must extend the prompt's tokens"
    with torch.no_grad():
        logits = model(torch.tensor([named], device=device)).logits[0].float()
    logp = torch.log_softmax(logits, -1)

    def entry(position: int, token: int) -> dict:
        row = logp[position]
        return {
            "token": tok.decode([token]),
            "p": float(row[token].exp()),
            "rank": int((row > row[token]).sum()) + 1,
        }

    first = len(prompt) - 1
    top = torch.topk(logp[first], TOP).indices.tolist()
    pieces = [entry(i - 1, named[i]) for i in range(len(prompt), len(named))]
    order = torch.argsort(logp[first], descending=True).tolist()
    out = {
        "model": MODEL,
        "prompt": PROMPT,
        "vocab": int(logits.shape[-1]),
        "top": [entry(first, t) for t in top],
        "passed": passed(order, pieces[0]["rank"] - 1, lambda t: tok.decode([t]), lambda t: entry(first, t)),
        "name": {"pieces": pieces, "p": float(torch.tensor([p["p"] for p in pieces]).prod())},
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

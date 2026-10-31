"""What Qwen3-8B-Base expects after "Standard", for the hero: its five likeliest next tokens, and the
two tokens of our name (" Log", then "its") with their probabilities and ranks. Writes
src/lib/standard.json, which the hero reads; every number the hero shows comes from it.

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
OUT = Path(__file__).resolve().parents[2] / "src/lib/standard.json"


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
    out = {
        "model": MODEL,
        "prompt": PROMPT,
        "vocab": int(logits.shape[-1]),
        "top": [entry(first, t) for t in top],
        "name": {"pieces": pieces, "p": float(torch.tensor([p["p"] for p in pieces]).prod())},
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

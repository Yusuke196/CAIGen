import json
from collections import defaultdict
from dataclasses import asdict
from pathlib import Path
from typing import Generator

from src.sentence import Sentence


def write_jsonl(
    sents: list[Sentence] | Generator[Sentence, None, None],
    out_path: Path,
    assign_span_info_to: list[str],
) -> None:
    with open(out_path, "w") as writer:
        for sent in sents:
            record = _build_jsonl_record(sent, assign_span_info_to)
            writer.write(json.dumps(record, ensure_ascii=False) + "\n")

    print("Wrote", out_path)


def _build_jsonl_record(sent: Sentence, assign_span_info_to: list[str]) -> dict:
    # Remove unnecessary fields
    record = {
        "id": sent.id,
        "text": sent.text,
        "tokens": [asdict(token) for token in sent.tokens],
        "spans": sent.spans,
    }

    if "sentence" in assign_span_info_to:
        # Select useful keys in spans
        keys = ["surface", "indices", "type", "is_seen"]
        record["spans"] = [
            {key: value for key, value in span.items() if key in keys}
            for span in record["spans"]
        ]

    if "token" in assign_span_info_to:
        tokeni_to_spannums = defaultdict(list)
        # tokeni_to_spans = defaultdict(list)
        for span_i, span in enumerate(sent.spans, 1):
            for i in span["indices"]:
                tokeni_to_spannums[i].append(str(span_i))
                # tokeni_to_spans[i].append(span)

        record["tokens"] = [
            {
                "surface": token["surface"],
                "lemma": token["lemma"],
                "pos": token["pos"],
                "tag": ";".join(tokeni_to_spannums[i]),
            }
            for i, token in enumerate(record["tokens"], 1)
        ]

    return record

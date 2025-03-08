import argparse
from pathlib import Path

from src.excel_reader import ExcelReader
from src.utils import write_jsonl


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--in_dir", "-i", type=str, default="annotated")
    parser.add_argument("--preann_dir", "-p", type=str, default="data/json_files")
    parser.add_argument(
        "--sheet_names",
        type=str,
        nargs="+",
        default=None,  # Read all sheets in given Excel files
    )
    parser.add_argument(
        "--append_span_info_to",
        type=str,
        nargs="+",
        choices=["token", "sentence"],
        default="token",
        help="Specify 'token' to add 'tag' property to each token object in the output."
        "Specify 'sentence' to add 'spans' property to each sentence object.",
    )
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    return args


def main() -> None:
    args = parse_args()

    for in_file in Path(args.in_dir).rglob("*.xlsx"):
        reader = ExcelReader(
            in_file, args.sheet_names, args.preann_dir, debug=args.debug
        )

        # Write a JSONL file
        out_jsonl = in_file.with_suffix(".jsonl")
        write_jsonl(reader, out_jsonl, args.append_span_info_to)

        if args.debug:
            break


if __name__ == "__main__":
    main()

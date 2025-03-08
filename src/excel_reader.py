import json
from pathlib import Path
from typing import Any, Generator

import pandas as pd
from src.sentence import Sentence


class ExcelReader:
    def __init__(
        self, in_file: Path, sheet_names: list[str] | None, preann_dir: str, debug=False
    ):
        """
        Args:
            in_file: An Excel file.
            sheet_names: A list of sheet names to read. If None, read all sheets.
            preann_dir: A directory containing pre-annotation files. We use them because they are free from the risk of accidentally being modified by annotators.
        """
        self.in_file = in_file
        self.sheet_names = self.get_sheet_names(sheet_names)
        self.preann = get_preann(preann_dir, self.sheet_names)
        self.band_width = 12
        self.debug = debug

    def __iter__(self) -> Generator[Sentence, None, None]:
        excel_sheet_names = pd.ExcelFile(self.in_file).sheet_names

        for sheet_name in self.sheet_names:
            if sheet_name not in excel_sheet_names:
                continue

            print("Reading", self.in_file, sheet_name)
            df = pd.read_excel(self.in_file, sheet_name=sheet_name, header=None)

            row_i = 0
            for row_i in range(0, len(df), self.band_width):
                # The df consists of bands, which are groups of rows
                # There are two types of bands: header band and checkbox band
                # Skip checkbox bands, which don't have any text in the topleft cell
                if not isinstance(df.iloc[row_i, 0], str):
                    continue

                sent_id = df.iloc[row_i, 0]
                summary = df.iloc[row_i + 2 : row_i + self.band_width - 1, :2]
                summary.columns = ["span", "indices"]
                sent = Sentence.from_id(sent_id, self.preann)

                sent.add_spans_from_summary(summary)

                yield sent

            if self.debug:
                break

    def get_sheet_names(self, sheet_names: list[str] | None) -> list[str]:
        if sheet_names is None:
            return [
                s for s in pd.ExcelFile(self.in_file).sheet_names if s != "facesheet"
            ]
        else:
            return sheet_names


def get_preann(preann_dir: str, sheet_names: list[str]) -> pd.DataFrame:
    """
    Return a DataFrame containing pre-annotation data.
    """
    preann = []
    for sheet_name in sheet_names:
        with open(f"{preann_dir}/{sheet_name}.json") as f:
            for d in json.load(f):
                preann.append(d)

    return pd.DataFrame(preann)

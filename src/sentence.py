from dataclasses import dataclass, field

import pandas as pd


@dataclass
class Sentence:
    id: str
    text: str
    tokens: list[dict]
    spans: list[dict] = field(default_factory=list)
    # annotators: list[str] = field(default_factory=list)
    # reviewer: str = None

    @classmethod
    def from_id(cls, id: str, preann: pd.DataFrame):
        srs = preann.query(f'id == "{id}"').iloc[0]
        tokens = [Token(**dct) for dct in srs["tokens"]]

        return cls(id, srs["text"], tokens)

    def add_spans_from_summary(self, summary: pd.DataFrame):
        summary.dropna(inplace=True, subset=["span"], how="all")
        surfaces = [str(token) for token in self.tokens]
        spans = [
            {
                "surface": " ".join([surfaces[int(i) - 1] for i in indices.split()]),
                "indices": [int(i) for i in indices.split()],
                "indices_str": indices,  # Used as the id for spans
            }
            for indices in summary["indices"]
        ]
        self.spans = sorted(spans, key=lambda span: span["indices"][0])

    def add_annttr_reviewer(self, annttr_revier_dict: dict):
        self.annotators = [
            annttr_revier_dict["annotator_1"],
            annttr_revier_dict["annotator_2"],
        ]
        self.reviewer = annttr_revier_dict["reviewer"]

    # def add_lemmas_and_pos(self, doc: spacy.tokens.Doc):
    #     self.tokens = [Token(token.text, token.lemma_, token.pos_) for token in doc]


@dataclass
class Token:
    surface: str
    lemma: str | None = field(default=None)
    pos: str | None = field(default=None)

    def __str__(self):
        return self.surface

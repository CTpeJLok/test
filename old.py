from pathlib import Path
import json

from docling.document_converter import (
    DocumentConverter,
    PdfFormatOption,
    WordFormatOption,
)
from docling.datamodel.base_models import InputFormat, DocumentStream
from docling.datamodel.document import ConversionResult
from docling.pipeline.standard_pdf_pipeline import StandardPdfPipeline
from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend
from docling.backend.msword_backend import MsWordDocumentBackend


def extract_doc(path: Path | str | DocumentStream):
    converter = DocumentConverter(
        allowed_formats=[
            InputFormat.PDF,
            InputFormat.IMAGE,
            InputFormat.DOCX,
            InputFormat.PPTX,
            InputFormat.CSV,
            InputFormat.MD,
            InputFormat.HTML,
            InputFormat.ASCIIDOC,
        ],
        format_options={
            InputFormat.PDF: PdfFormatOption(
                pipeline_cls=StandardPdfPipeline,
                backend=PyPdfiumDocumentBackend,
            ),
            InputFormat.DOCX: WordFormatOption(
                backend=MsWordDocumentBackend,
            ),
        },
    )

    result: ConversionResult = converter.convert(path)

    with open("result.md", "w", encoding="utf-8") as f:
        f.write(result.document.export_to_markdown())

    with open("result.json", "w", encoding="utf-8") as f:
        f.write(
            json.dumps(result.document.export_to_dict(), ensure_ascii=False, indent=2)
        )


extract_doc("docs/test2.pdf")

import json
import time
from pathlib import Path

from docling.datamodel.base_models import InputFormat
from docling.datamodel.document import ConversionResult
from docling.datamodel.pipeline_options import (
    OcrAutoOptions,
    PdfPipelineOptions,
    PictureDescriptionVlmEngineOptions,
    TableStructureOptions,
)
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling_core.types.io import DocumentStream


def extract_doc(path: Path | str | DocumentStream):
    tso = TableStructureOptions()
    tso.do_cell_matching = True

    oo = OcrAutoOptions()
    oo.lang = ["rus", "eng"]

    pdo = PictureDescriptionVlmEngineOptions.from_preset("smolvlm")
    pdo.prompt = "Опиши картинку в паре предложений на русском языке."

    doc_converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(
                pipeline_options=PdfPipelineOptions(
                    do_ocr=True,
                    do_table_structure=True,
                    table_structure_options=tso,
                    ocr_options=oo,
                    do_picture_description=True,
                    picture_description_options=pdo,
                )
            )
        }
    )

    start_time = time.time()
    conv_result: ConversionResult = doc_converter.convert(path)
    end_time = time.time() - start_time

    print(f"Document converted in {end_time:.2f} seconds.")

    ## Export results
    output_dir = Path("results")
    output_dir.mkdir(parents=True, exist_ok=True)
    doc_filename = conv_result.input.file.stem

    # Export Docling document JSON format:
    with (output_dir / f"{doc_filename}.json").open("w", encoding="utf-8") as fp:
        fp.write(json.dumps(conv_result.document.export_to_dict()))

    # Export Text format (plain text via Markdown export):
    with (output_dir / f"{doc_filename}.txt").open("w", encoding="utf-8") as fp:
        fp.write(conv_result.document.export_to_markdown(strict_text=True))

    # Export Markdown format:
    with (output_dir / f"{doc_filename}.md").open("w", encoding="utf-8") as fp:
        fp.write(conv_result.document.export_to_markdown())

    # Export Document Tags format:
    with (output_dir / f"{doc_filename}.doctags").open("w", encoding="utf-8") as fp:
        fp.write(conv_result.document.export_to_doctags())


extract_doc("docs/test_bank.pdf")

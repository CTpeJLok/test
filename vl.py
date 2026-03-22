import json
import time
from pathlib import Path

from docling.datamodel.base_models import InputFormat
from docling.datamodel.document import ConversionResult
from docling.datamodel.pipeline_options import VlmConvertOptions, VlmPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.pipeline.vlm_pipeline import VlmPipeline
from docling_core.types.io import DocumentStream


def extract_doc(path: Path | str | DocumentStream):
    vlm_options = VlmConvertOptions.from_preset("granite_docling")

    doc_converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(
                pipeline_cls=VlmPipeline,
                pipeline_options=VlmPipelineOptions(vlm_options=vlm_options),
            ),
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


extract_doc("docs/test_3.pdf")

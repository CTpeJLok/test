from pathlib import Path

from docling.datamodel import asr_model_specs
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import AsrPipelineOptions
from docling.document_converter import AudioFormatOption, DocumentConverter
from docling.pipeline.asr_pipeline import AsrPipeline
from docling_core.types.io import DocumentStream


def extract_doc(path: Path | str | DocumentStream):
    pipeline_options = AsrPipelineOptions()
    pipeline_options.asr_options = asr_model_specs.WHISPER_MEDIUM

    # pipeline_options.accelerator_options.num_threads = 16
    # pipeline_options.asr_options.supported_devices = [AcceleratorDevice.CPU]

    converter = DocumentConverter(
        format_options={
            InputFormat.AUDIO: AudioFormatOption(
                pipeline_cls=AsrPipeline,
                pipeline_options=pipeline_options,
            )
        }
    )

    result = converter.convert(path)
    document = result.document

    for i in document.texts:
        source = i.source[0]
        print(f"[{source.start_time:<8.2f} - {source.end_time:<8.2f}]\t{i.text}")


extract_doc("docs/test.mp3")

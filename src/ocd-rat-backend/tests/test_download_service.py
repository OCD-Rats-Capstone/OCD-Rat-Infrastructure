"""
Tests for services/download_service.py and routers/files.py.
Covers FR6 sub-tests: CSV integrity, multi-format, no-match, and progress tracking.
"""

import pytest
import json
import os
from unittest.mock import patch, MagicMock, mock_open, call
from io import BytesIO


# ============================================================================
# Download service — unit tests (FRDR_download, NLP_FileDownload, FILTERS_FileDownload)
# ============================================================================


class TestFRDRDownload:
    """Tests for the core FRDR_download function."""

    @patch("services.download_service.json.dump")
    @patch("builtins.open", new_callable=mock_open)
    @patch("services.download_service.urlretrieve")
    @patch("services.download_service.os.makedirs")
    @patch("services.download_service.os.path.isdir", return_value=False)
    def test_downloads_files_with_https_urls(
        self, mock_isdir, mock_makedirs, mock_urlretrieve, mock_file, mock_json_dump
    ):
        """FR6-T1: Files with valid https URLs are downloaded."""
        from services.download_service import FRDR_download

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            ("https://frdr.example.com/file1.csv",),
            ("https://frdr.example.com/file2.jpg",),
        ]

        FRDR_download(mock_conn, mock_cursor, [1, 2], ["csv", "jpg"], "job123")

        assert mock_urlretrieve.call_count == 2
        mock_cursor.execute.assert_called_once()

    @patch("services.download_service.json.dump")
    @patch("builtins.open", new_callable=mock_open)
    @patch("services.download_service.urlretrieve")
    @patch("services.download_service.os.makedirs")
    @patch("services.download_service.os.path.isdir", return_value=False)
    def test_skips_non_https_urls(
        self, mock_isdir, mock_makedirs, mock_urlretrieve, mock_file, mock_json_dump
    ):
        """FR6-T3: Non-https URLs are filtered out."""
        from services.download_service import FRDR_download

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            ("ftp://internal.server/file.dat",),
            ("/local/path/file.csv",),
        ]

        FRDR_download(mock_conn, mock_cursor, [1], ["csv"], "job456")

        mock_urlretrieve.assert_not_called()

    @patch("services.download_service.json.dump")
    @patch("builtins.open", new_callable=mock_open)
    @patch("services.download_service.urlretrieve")
    @patch("services.download_service.os.makedirs")
    @patch("services.download_service.os.path.isdir", return_value=False)
    def test_no_matching_files_completes(
        self, mock_isdir, mock_makedirs, mock_urlretrieve, mock_file, mock_json_dump
    ):
        """FR6-T3: Empty result set — download completes with zero files."""
        from services.download_service import FRDR_download

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = []

        FRDR_download(mock_conn, mock_cursor, [999], ["csv"], "job789")

        mock_urlretrieve.assert_not_called()
        # Status should still be written with num_files: 0
        status_calls = mock_json_dump.call_args_list
        last_status = status_calls[-1][0][0]
        assert last_status["job789"]["num_files"] == 0
        assert last_status["job789"]["status"] == "ready"

    @patch("services.download_service.json.dump")
    @patch("builtins.open", new_callable=mock_open)
    @patch("services.download_service.urlretrieve")
    @patch("services.download_service.os.makedirs")
    @patch("services.download_service.os.path.isdir", return_value=False)
    def test_progress_tracking_increments(
        self, mock_isdir, mock_makedirs, mock_urlretrieve, mock_file, mock_json_dump
    ):
        """FR6-T4: Status JSON 'completed' field increments per file."""
        from services.download_service import FRDR_download

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            ("https://frdr.example.com/a.csv",),
            ("https://frdr.example.com/b.csv",),
            ("https://frdr.example.com/c.csv",),
        ]

        FRDR_download(mock_conn, mock_cursor, [1, 2, 3], ["csv"], "job_prog")

        # json.dump is called once per file (in-progress) + once at end (ready)
        assert mock_json_dump.call_count == 4  # 3 in-progress + 1 ready

        # Check that completed increments
        completed_values = []
        for c in mock_json_dump.call_args_list:
            status = c[0][0]["job_prog"]
            completed_values.append(status["completed"])

        assert completed_values == [1, 2, 3, 3]

    @patch("services.download_service.shutil.rmtree")
    @patch("services.download_service.json.dump")
    @patch("builtins.open", new_callable=mock_open)
    @patch("services.download_service.urlretrieve")
    @patch("services.download_service.os.makedirs")
    @patch("services.download_service.os.path.isdir", return_value=True)
    def test_cleans_existing_temp_dir(
        self, mock_isdir, mock_makedirs, mock_urlretrieve, mock_file, mock_json_dump, mock_rmtree
    ):
        """FR6-T2: Existing temp directory is cleaned before download."""
        from services.download_service import FRDR_download

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = []

        FRDR_download(mock_conn, mock_cursor, [1], ["csv"], "job_clean")

        mock_rmtree.assert_called_once_with("../FRDR_Files")


class TestFileTypeFiltering:
    """Tests for the file-type trimming logic used by both NLP and FILTER downloads."""

    def test_nlp_trims_file_types(self):
        """FR6-T2: Only 'true'-flagged types are included."""
        from services.download_service import NLP_FileDownload

        file_types = [
            ["csv", "true"],
            ["ewb", "false"],
            ["jpg", "true"],
            ["mpg", "false"],
            ["gif", "false"],
        ]

        # Mock out the actual download to isolate file-type trimming
        with patch("services.download_service.execute_nlp_query") as mock_nlp, \
             patch("services.download_service.FRDR_download") as mock_frdr, \
             patch("builtins.open", mock_open(read_data='"SELECT 1"')):

            mock_nlp.return_value = {"results": [{"session_id": 1}]}
            NLP_FileDownload(MagicMock(), file_types, "j1")

            called_types = mock_frdr.call_args[0][3]
            assert called_types == ["csv", "jpg"]

    def test_filters_trims_file_types(self):
        """FR6-T2: FILTERS path also trims correctly."""
        from services.download_service import FILTERS_FileDownload

        file_types = [
            ["csv", "true"],
            ["ewb", "true"],
            ["jpg", "false"],
            ["mpg", "false"],
            ["gif", "true"],
        ]

        with patch("services.download_service.FRDR_download") as mock_frdr, \
             patch("builtins.open", mock_open(read_data="[1, 2, 3]")):

            FILTERS_FileDownload(MagicMock(), file_types, "j2")

            called_types = mock_frdr.call_args[0][3]
            assert called_types == ["csv", "ewb", "gif"]



.PHONY: help install install-dev test test-unit test-integration lint format clean

help:
	@echo "actor_maker - Development Commands"
	@echo ""
	@echo "⚠️  Remember to activate venv: source venv/bin/activate"
	@echo ""
	@echo "Setup:"
	@echo "  make venv          Create virtual environment"
	@echo "  make install       Install package and dependencies (in venv)"
	@echo "  make install-dev   Install with development dependencies (in venv)"
	@echo "  make setup         Initial setup (venv + .env + dev deps)"
	@echo ""
	@echo "Testing:"
	@echo "  make test          Run all tests"
	@echo "  make test-unit     Run unit tests only"
	@echo "  make test-integration  Run integration tests only"
	@echo "  make test-setup    Validate environment setup"
	@echo "  make coverage      Run tests with coverage report"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint          Run linting checks (flake8)"
	@echo "  make format        Format code with black"
	@echo "  make type-check    Run type checking with mypy"
	@echo "  make check-all     Run all checks (lint, type-check, test)"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean         Remove build artifacts and cache"
	@echo "  make clean-all     Deep clean (including .env)"
	@echo ""
	@echo "Examples:"
	@echo "  make run-examples  Run example scripts"

# Python and venv
PYTHON := venv/bin/python
PIP := venv/bin/pip
PYTEST := venv/bin/pytest

# Setup commands
venv:
	@if [ ! -d venv ]; then \
		echo "Creating virtual environment..."; \
		python3 -m venv venv; \
		echo "✅ Virtual environment created"; \
	else \
		echo "ℹ️  Virtual environment already exists"; \
	fi

install: venv
	$(PIP) install -r requirements.txt
	@echo "✅ Dependencies installed in venv"

install-dev: venv
	$(PIP) install -r requirements.txt
	$(PIP) install pytest pytest-cov black flake8 mypy
	@echo "✅ Development dependencies installed in venv"

setup: install-dev
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ Created .env file from .env.example"; \
		echo "⚠️  Please edit .env with your API keys"; \
		echo ""; \
		echo "To activate venv, run: source venv/bin/activate"; \
	else \
		echo "ℹ️  .env file already exists"; \
		echo "To activate venv, run: source venv/bin/activate"; \
	fi

# Testing commands
test:
	$(PYTEST) tests/ -v

test-unit:
	$(PYTEST) tests/unit/ -v

test-integration:
	$(PYTEST) tests/integration/ -v

test-setup:
	$(PYTHON) tests/test_setup.py

coverage:
	$(PYTEST) --cov=src --cov-report=html --cov-report=term tests/
	@echo "📊 Coverage report generated in htmlcov/index.html"

# Code quality commands
lint:
	venv/bin/flake8 src/ tests/ examples/ --max-line-length=120 --exclude=__pycache__,.git

format:
	venv/bin/black src/ tests/ examples/ --line-length=120

type-check:
	venv/bin/mypy src/ --ignore-missing-imports

check-all: lint type-check test
	@echo "✅ All checks passed!"

# Cleanup commands
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".coverage" -delete
	rm -rf build/ dist/

clean-all: clean
	@echo "⚠️  This will remove .env and venv. Continue? [y/N] " && read ans && [ $${ans:-N} = y ]
	rm -f .env
	rm -rf venv/
	@echo "✅ Deep clean complete (run 'make setup' to recreate)"

# Example commands
run-examples:
	@echo "Running example_usage.py..."
	$(PYTHON) examples/example_usage.py
	@echo ""
	@echo "Running s3_usage.py..."
	$(PYTHON) examples/s3_usage.py

# Development helpers
watch-tests:
	@echo "Watching for changes and running tests..."
	@which pytest-watch > /dev/null || (echo "Install pytest-watch: pip install pytest-watch" && exit 1)
	ptw tests/ -- -v

# Documentation
docs:
	@echo "📚 Documentation files:"
	@echo "  - README.md"
	@echo "  - PROJECT_STRUCTURE.md"
	@echo "  - CONTRIBUTING.md"
	@echo "  - docs/QUICK_REFERENCE.md"
	@echo "  - docs/IMPLEMENTATION_SUMMARY.md"

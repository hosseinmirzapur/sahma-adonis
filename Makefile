dev:
	@bun run dev

lint:
	@bun run lint --fix

deps:
	@echo "Installing system dependencies..."
	@sudo apt-get update
	@sudo apt-get install -y unoconv poppler-utils ffmpeg img2pdf imagemagick
	@echo "System dependencies installed successfully!"

	@echo "Installing bun.js..."
	@curl -fsSL https://bun.sh/install | bash
	@echo "bun.js installed successfully!"

.PHONY: dev lint deps
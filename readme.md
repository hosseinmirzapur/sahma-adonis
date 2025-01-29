# Adonis.js Sahma

Sahma is a DMS(document management system) which utilizes OCR, STT and ASR features into its core and provides functionalities beyond normal DMS well-known systems. 

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Usage](#usage)
4. [Development](#development)
5. [Deployment](#deployment)
6. [Makefile Commands](#makefile-commands)
7. [Dependencies](#dependencies)
8. [Contributing](#contributing)
9. [License](#license)

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:
- **Ubuntu** (or any Debian-based Linux distribution)
- **curl** (for installing bun.js)
- **sudo** privileges (for installing system dependencies)

---

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/hosseinmirzapur/sahma-adonis.git
cd sahma-adonis
```

### 2. Install Dependencies
Run the following command to install all system dependencies and bun.js:
```bash
make deps
```

This command will:
- Install system utilities: `unoconv`, `pdftoppm`, `ffmpeg`, `img2pdf`, and `convert` (from `imagemagick`).
- Install `bun.js` using the official installation script.

---

## Usage

### Running the Development Server
To start the development server, run:
```bash
make dev
```

### Linting the Code
To lint and automatically fix issues in your code, run:
```bash
make lint
```

---

## Development

### Project Structure
```
sahma-adonis/
├── src/                # Source code
├── tests/              # Test files
├── Makefile            # Makefile for common tasks
├── README.md           # Project documentation
└── ...                 # Other project files
```

### Adding New Dependencies
If you need to add new system dependencies, update the `make deps` command in the `Makefile`.

---

## Deployment

### 1. Install Dependencies on the Server
Ensure all dependencies are installed on the deployment server by running:
```bash
make deps
```

### 2. Deploy the Application
Follow your deployment process (e.g., using Docker, PM2, or any other tool).

---

## Makefile Commands

The `Makefile` provides the following commands for common tasks:

| Command     | Description                                    |
| ----------- | ---------------------------------------------- |
| `make dev`  | Starts the development server.                 |
| `make lint` | Lints the code and automatically fixes issues. |
| `make deps` | Installs all system dependencies and bun.js.   |

---

## Dependencies

### System Dependencies
The following system utilities are required for the project:
- **unoconv**: For document conversion.
- **pdftoppm**: Part of `poppler-utils` for PDF to image conversion.
- **ffmpeg**: For video/audio processing.
- **img2pdf**: For image to PDF conversion.
- **convert**: Part of `imagemagick` for image manipulation.

### JavaScript Runtime
- **bun.js**: A fast JavaScript runtime, installed via the official script.

---

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a pull request.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments
- Thanks to the developers of `bun.js` for creating an amazing runtime.
- Shoutout to the open-source community for providing the tools used in this project.

---

This `README.md` provides a comprehensive guide for setting up, using, and contributing to your project. You can customize it further to suit your specific needs. 🚀
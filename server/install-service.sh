#!/bin/bash

echo "🚀 Installing Crush Coarse Notifications Service..."

# Ensure npm is installed
if ! command -v npm &> /dev/null
then
    echo "❌ npm could not be found. Please install nodejs and npm first."
    exit
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Check if the Firebase key exists
if [ ! -f firebase-service-account.json ]; then
    echo "⚠️  WARNING: firebase-service-account.json not found in this folder."
    echo "Make sure to add it before the service will start correctly!"
fi

# Get the absolute path to this folder
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_NAME="crush-coarse-notifier"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "⚙️ Creating systemd service file..."

sudo bash -c "cat > ${SERVICE_FILE}" << EOF
[Unit]
Description=Crush Coarse Cafe Push Notifications Server
After=network.target

[Service]
ExecStart=/usr/bin/npm start
WorkingDirectory=${DIR}
Restart=always
User=${USER}
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "🔄 Reloading systemd daemon and enabling service..."
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl start ${SERVICE_NAME}

echo "✅ Setup complete! The service is now running in the background natively (headless)."
echo "You can check the logs anytime with: sudo journalctl -u ${SERVICE_NAME} -f"

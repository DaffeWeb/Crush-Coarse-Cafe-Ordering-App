#!/bin/bash

SERVICE_NAME="crush-coarse-notifier"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "🛑 Stopping and disabling ${SERVICE_NAME}..."
sudo systemctl stop ${SERVICE_NAME}
sudo systemctl disable ${SERVICE_NAME}

echo "🗑️ Removing systemd service file..."
sudo rm -f ${SERVICE_FILE}

echo "🔄 Reloading systemd daemon..."
sudo systemctl daemon-reload
sudo systemctl reset-failed

echo "✅ Service has been completely removed from your system."

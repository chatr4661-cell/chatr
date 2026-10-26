const fs = require('fs');
const path = require('path');

const iconPath = path.resolve(__dirname, '../public/icons/icon-192x192.png');
const iconBase64 = fs.readFileSync(iconPath).toString('base64');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            <key>Icon</key>
            <data>${iconBase64}</data>
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>Chatr+</string>
            <key>PayloadDescription</key>
            <string>Chatr+ Web Clip</string>
            <key>PayloadDisplayName</key>
            <string>Chatr+</string>
            <key>PayloadIdentifier</key>
            <string>com.chatr.app.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>B4C26E92-6F77-4D2A-9491-9BF5F5D0A111</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>URL</key>
            <string>https://chatr.chat</string>
            <key>Precomposed</key>
            <true/>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>Chatr+ App</string>
    <key>PayloadIdentifier</key>
    <string>com.chatr.app.profile</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>A1B2C3D4-E5F6-7890-1234-56789ABCDEF0</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

const targetPath = path.resolve(__dirname, '../public/chatr-install.mobileconfig');
fs.writeFileSync(targetPath, xml, 'utf8');
console.log('✅ Generated public/chatr-install.mobileconfig');

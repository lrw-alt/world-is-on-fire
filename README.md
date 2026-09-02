# FireMap (Ember Atlas)

Real-time wildfire monitoring dashboard and community incident reporting system.

---

## Running on Android (Termux)

FireMap can be run directly on an Android device using [Termux](https://termux.dev/).

### 1. Prerequisites in Termux
Open Termux and install Node.js (LTS) and Git:
```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts git -y
```
*(Optional: If using `termux-tools` for automatic browser launch)*:
```bash
pkg install termux-tools -y
```

### 2. Setup the Project
Clone or copy the project into Termux and enter the directory:
```bash
cd firemap
npm install
```
*(Or if using Bun: `bun install`)*

### 3. Start the Server (Localhost Default)
Run the automated launcher:
```bash
chmod +x ./termux.sh
./termux.sh
```
Or start via npm/bun directly:
```bash
npm run dev
# Or explicitly:
npm run dev:termux
```

### 4. Access on Android
Open your phone's browser (Chrome, Firefox, Brave, etc.) and visit:
👉 **`http://localhost:3000`**

---

## Host & Network Configuration

- **Default (`localhost`)**: Binds to loopback (`127.0.0.1`), optimal for running locally on your phone in Termux.
- **LAN Sharing (`0.0.0.0`)**: If you want to expose the server to other devices on the same Wi-Fi network, run:
  ```bash
  npm run dev:lan
  # or
  HOST=0.0.0.0 npm run dev
  ```
- **File Watching (Android Storage)**: If editing files on shared Android internal storage (`/sdcard`) where standard inotify events are restricted, enable polling mode:
  ```bash
  VITE_USE_POLLING=true npm run dev
  ```


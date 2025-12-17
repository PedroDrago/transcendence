# InstallPWA Component

A React component that provides a user-friendly button to install your Progressive Web App (PWA).

## Features

✅ **Auto-detection**: Only shows when the app can be installed
✅ **Auto-hide**: Disappears after installation or if already installed
✅ **Smooth animations**: Beautiful slide-in and hover effects
✅ **Responsive**: Works on desktop and mobile devices
✅ **Accessible**: Includes proper ARIA labels
✅ **Modern design**: Gradient button with icon

## How it works

1. The component listens for the `beforeinstallprompt` event
2. When detected, it shows an "Install App" button
3. When clicked, it triggers the native install prompt
4. After installation, the button automatically disappears

## Usage

The component is already added to your root layout, so it will appear on all pages when the app is installable.

```tsx
import InstallPWA from '@/components/InstallPWA';

export default function Layout({ children }) {
  return (
    <div>
      {children}
      <InstallPWA />
    </div>
  );
}
```

## Customization

### Position
Edit the CSS in `styles.css` to change the position:
```css
.install-pwa-container {
  position: fixed;
  bottom: 20px;  /* Change these values */
  right: 20px;   /* to reposition */
}
```

### Colors
Change the gradient colors:
```css
.install-pwa-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* Replace with your brand colors */
}
```

### Button Text
Edit the text in `index.tsx`:
```tsx
<span className="install-text">Install App</span>
```

## Browser Support

- ✅ Chrome/Edge (Android & Desktop)
- ✅ Safari (iOS 16.4+)
- ✅ Firefox (limited support)
- ❌ Safari (macOS) - manual installation via Share button

## Testing

1. Build the app for production:
   ```bash
   npm run build
   npm start
   ```

2. Open in Chrome/Edge (Desktop):
   - The button should appear after a few seconds
   - Click to test installation

3. Test on mobile:
   - Deploy to a server with HTTPS
   - Open on mobile browser
   - Button should appear if not already installed

## Notes

- The button only appears in production builds (PWA is disabled in dev mode)
- Requires HTTPS (or localhost for testing)
- Some browsers may have additional requirements
- The component is a Client Component (`'use client'`) to handle browser events

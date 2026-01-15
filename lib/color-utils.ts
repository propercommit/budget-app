export function hexToLightColor(hex: string): string {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    // Convert to HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    
    if (max !== min) {
        const d = max - min;
        s = d / (1 - Math.abs(max + min - 1));
        
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / d + 2) * 60;
        else h = ((r - g) / d + 4) * 60;
    }
    
    // Return HSL with 95% lightness (light version)
    return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, 95%)`;
}
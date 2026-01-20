import { ShoppingCart, Fuel, HeartPulse, Lightbulb, Film, PiggyBank, Home, Car, CreditCard, Phone, Utensils, Plane, Grid2X2 } from "lucide-react";

export const iconMap: Record<string, React.ReactNode> = {
    "shopping-cart": <ShoppingCart className="w-5 h-5" />,
    "fuel": <Fuel className="w-5 h-5" />,
    "heart-pulse": <HeartPulse className="w-5 h-5" />,
    "lightbulb": <Lightbulb className="w-5 h-5" />,
    "film": <Film className="w-5 h-5" />,
    "piggy-bank": <PiggyBank className="w-5 h-5" />,
    "home": <Home className="w-5 h-5" />,
    "car": <Car className="w-5 h-5" />,
    "credit-card": <CreditCard className="w-5 h-5" />,
    "phone": <Phone className="w-5 h-5" />,
    "utensils": <Utensils className="w-5 h-5" />,
    "plane": <Plane className="w-5 h-5" />,
    "all": <Grid2X2 className="w-5 h-5"></Grid2X2>
};

export const availableIcons = [
    { id: "shopping-cart", name: "Shopping" },
    { id: "fuel", name: "Fuel" },
    { id: "heart-pulse", name: "Health" },
    { id: "lightbulb", name: "Utilities" },
    { id: "film", name: "Entertainment" },
    { id: "piggy-bank", name: "Savings" },
    { id: "home", name: "Home" },
    { id: "car", name: "Car" },
    { id: "credit-card", name: "Credit" },
    { id: "phone", name: "Phone" },
    { id: "utensils", name: "Food" },
    { id: "plane", name: "Travel" },
];
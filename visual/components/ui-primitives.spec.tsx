import { test, expect } from "../test";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { CardHeader as ExpandableCardHeader } from "@/components/ui/card-header";
import { ExpandToggleButton } from "@/components/ui/expand-toggle-button";
import { DeleteConfirmSection } from "@/components/ui/delete-confirm-section";
import { ReceiptViewer } from "@/components/ui/receipt-viewer";
import { noop } from "../fixtures";

const receiptSvg =
  "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='440'><rect width='100%' height='100%' fill='#f2f2f7'/><text x='50%' y='50%' text-anchor='middle' font-family='sans-serif' font-size='24' fill='#1d1d1f'>Receipt</text></svg>";

// A base64 SVG data URI loads reliably in Chromium (unlike the `;utf8,` form).
const receiptDataUrl = `data:image/svg+xml;base64,${Buffer.from(receiptSvg).toString("base64")}`;

test.describe("UI primitives", () => {
  test("button variants and sizes", async ({ mount }) => {
    const component = await mount(
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="default">Default</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </div>,
    );

    await expect(component).toHaveScreenshot("buttons.png");
  });

  test("form controls", async ({ mount }) => {
    const component = await mount(
      <div className="flex flex-col gap-4 p-6 max-w-sm">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="demo">Email address</Label>
          <Input id="demo" placeholder="you@example.com" />
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={true} />
            Checked
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={false} />
            Unchecked
          </label>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={true} />
            On
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={false} />
            Off
          </label>
        </div>
        <Slider defaultValue={[40]} max={100} step={1} />
      </div>,
    );

    await expect(component).toHaveScreenshot("form-controls.png");
  });

  test("card + expandable header + toggles", async ({ mount }) => {
    const component = await mount(
      <div className="flex flex-col gap-4 p-6 max-w-md">
        <Card>
          <CardContent className="p-5">
            <CardTitle>Card title</CardTitle>
            <CardDescription>A basic surface with a title and description.</CardDescription>
          </CardContent>
        </Card>
        <div className="rounded-2xl border border-gray-200 bg-white">
          <ExpandableCardHeader isExpanded={false} onToggle={noop} title="Expandable section" />
        </div>
        <div className="flex items-center gap-4">
          <ExpandToggleButton isExpanded={false} onToggle={noop} />
          <ExpandToggleButton isExpanded={true} onToggle={noop} />
        </div>
      </div>,
    );

    await expect(component).toHaveScreenshot("card-and-toggles.png");
  });

  test("delete confirm section", async ({ mount }) => {
    const component = await mount(
      <div className="max-w-md p-6">
        <DeleteConfirmSection label="Delete item" onDelete={noop} />
      </div>,
    );

    await expect(component).toHaveScreenshot("delete-confirm-section.png");
  });

  test("receipt viewer", async ({ mount, page }) => {
    await mount(<ReceiptViewer isOpen={true} onClose={noop} imageUrl={receiptDataUrl} />);

    await expect(page.getByRole("img", { name: "Receipt" })).toBeVisible();

    await expect(page).toHaveScreenshot("receipt-viewer.png");
  });
});

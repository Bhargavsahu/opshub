import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardTitle } from "./Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies border and shadow", () => {
    const { container } = render(<Card>Test</Card>);
    const card = container.firstElementChild!;
    expect(card.className).toContain("rounded-lg");
    expect(card.className).toContain("shadow-sm");
  });

  it("merges className", () => {
    const { container } = render(<Card className="mt-4">Test</Card>);
    expect(container.firstElementChild!.className).toContain("mt-4");
  });
});

describe("CardHeader", () => {
  it("renders with flex layout", () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    expect(container.firstElementChild!.className).toContain("flex");
  });
});

describe("CardTitle", () => {
  it("renders as h3", () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Title");
  });
});

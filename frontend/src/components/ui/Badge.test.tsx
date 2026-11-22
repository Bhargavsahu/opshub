import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies default variant styling", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default").className).toContain("bg-gray-100");
  });

  it("applies success variant", () => {
    render(<Badge variant="success">Approved</Badge>);
    expect(screen.getByText("Approved").className).toContain("bg-green-100");
  });

  it("applies danger variant", () => {
    render(<Badge variant="danger">Rejected</Badge>);
    expect(screen.getByText("Rejected").className).toContain("bg-red-100");
  });

  it("applies warning variant", () => {
    render(<Badge variant="warning">Pending</Badge>);
    expect(screen.getByText("Pending").className).toContain("bg-yellow-100");
  });

  it("applies info variant", () => {
    render(<Badge variant="info">New</Badge>);
    expect(screen.getByText("New").className).toContain("bg-blue-100");
  });

  it("merges custom className", () => {
    render(<Badge className="ml-2">Custom</Badge>);
    expect(screen.getByText("Custom").className).toContain("ml-2");
  });
});

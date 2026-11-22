import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn().mockResolvedValue({
      data: {
        accessToken: "tok",
        user: { id: "1", name: "Admin", role: "ADMIN", email: "admin@opshub.demo" },
      },
    }),
  },
}));

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the OpsHub branding", () => {
    renderLogin();
    expect(screen.getByText("Welcome to OpsHub")).toBeInTheDocument();
    expect(screen.getByText("Small-business operations suite")).toBeInTheDocument();
  });

  it("shows three demo login buttons", () => {
    renderLogin();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Manager")).toBeInTheDocument();
    expect(screen.getByText("Employee")).toBeInTheDocument();
  });

  it("shows demo account descriptions", () => {
    renderLogin();
    expect(screen.getByText("Full access to all modules")).toBeInTheDocument();
    expect(screen.getByText("Team management & approvals")).toBeInTheDocument();
    expect(screen.getByText("Personal leave, tasks & chat")).toBeInTheDocument();
  });

  it("calls api and login on demo button click", async () => {
    const { api } = await import("@/lib/api");
    renderLogin();

    await userEvent.click(screen.getByText("Admin"));

    expect(api.post).toHaveBeenCalledWith("/auth/demo", { email: "admin@opshub.demo" });
    expect(mockLogin).toHaveBeenCalledWith("tok", expect.objectContaining({ role: "ADMIN" }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("shows the demo section heading", () => {
    renderLogin();
    expect(screen.getByText("Or try a demo account")).toBeInTheDocument();
  });
});

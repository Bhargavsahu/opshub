import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Layout } from "./Layout";

const mockLogout = vi.fn().mockResolvedValue(undefined);
const mockNavigate = vi.fn();
let mockUser = { id: "1", name: "Alice Admin", role: "ADMIN", email: "a@test.com", avatarUrl: null };
let mockHasRole = (...roles: string[]) => roles.includes(mockUser.role);

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    hasRole: mockHasRole,
  }),
}));

function renderLayout() {
  return render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>,
  );
}

describe("Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "1", name: "Alice Admin", role: "ADMIN", email: "a@test.com", avatarUrl: null };
    mockHasRole = (...roles: string[]) => roles.includes(mockUser.role);
  });

  it("renders all standard nav items", () => {
    renderLayout();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Leave")).toBeInTheDocument();
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });

  it("shows Admin nav for ADMIN role", () => {
    renderLayout();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("hides Admin nav for EMPLOYEE role", () => {
    mockUser = { ...mockUser, role: "EMPLOYEE" };
    mockHasRole = (...roles: string[]) => roles.includes("EMPLOYEE");
    renderLayout();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("displays user name and role", () => {
    renderLayout();
    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
  });

  it("shows user initial avatar", () => {
    renderLayout();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("calls logout and navigates on logout click", async () => {
    renderLayout();
    const logoutBtn = screen.getByTitle("Logout");
    await userEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("renders OpsHub branding in sidebar", () => {
    renderLayout();
    expect(screen.getAllByText("OpsHub").length).toBeGreaterThanOrEqual(1);
  });
});

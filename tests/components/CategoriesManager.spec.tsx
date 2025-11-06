import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoriesManager } from '../../src/components/Settings/CategoriesManager';
import { CategoriesService } from '../../src/services/categoriesService';

// Mock CategoriesService
vi.mock('../../src/services/categoriesService', () => ({
  CategoriesService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('CategoriesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(CategoriesService.getAll).mockReturnValue(new Promise(() => {}));
    
    render(<CategoriesManager />);
    
    expect(screen.getByText('Cargando categorías...')).toBeInTheDocument();
  });

  it('should load and display categories', async () => {
    const mockCategories = [
      { id: 1, name: 'Alimentación' },
      { id: 2, name: 'Transporte' },
    ];
    
    vi.mocked(CategoriesService.getAll).mockResolvedValue(mockCategories);

    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByText('Alimentación')).toBeInTheDocument();
      expect(screen.getByText('Transporte')).toBeInTheDocument();
    });
  });

  it('should display empty state when no categories exist', async () => {
    vi.mocked(CategoriesService.getAll).mockResolvedValue([]);

    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByText(/No hay categorías/i)).toBeInTheDocument();
    });
  });

  it('should create a new category', async () => {
    const user = userEvent.setup();
    const mockCategories = [{ id: 1, name: 'Existing' }];
    const newCategory = { id: 2, name: 'Nueva Categoría' };
    
    vi.mocked(CategoriesService.getAll).mockResolvedValue(mockCategories);
    vi.mocked(CategoriesService.create).mockResolvedValue(newCategory);

    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByText('Existing')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Nueva categoría');
    const createButton = screen.getByRole('button', { name: /crear/i });

    await user.type(input, 'Nueva Categoría');
    await user.click(createButton);

    await waitFor(() => {
      expect(CategoriesService.create).toHaveBeenCalledWith({
        name: 'Nueva Categoría',
        description: '',
        isActive: true,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Nueva Categoría')).toBeInTheDocument();
    });
  });

  it('should not create category with empty name', async () => {
    const user = userEvent.setup();
    vi.mocked(CategoriesService.getAll).mockResolvedValue([]);

    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nueva categoría')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /crear/i });
    await user.click(createButton);

    expect(CategoriesService.create).not.toHaveBeenCalled();
  });

  it('should delete a category when confirmed', async () => {
    const user = userEvent.setup();
    const mockCategories = [
      { id: 1, name: 'To Delete' },
      { id: 2, name: 'Keep This' },
    ];
    
    vi.mocked(CategoriesService.getAll).mockResolvedValue(mockCategories);
    vi.mocked(CategoriesService.delete).mockResolvedValue({});

    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByText('To Delete')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Eliminar');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(CategoriesService.delete).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.queryByText('To Delete')).not.toBeInTheDocument();
      expect(screen.getByText('Keep This')).toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });

  it('should handle error when loading categories', async () => {
    vi.mocked(CategoriesService.getAll).mockRejectedValue(new Error('Failed to load'));

    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar las categorías/i)).toBeInTheDocument();
    });
  });

  it('should start and cancel editing', async () => {
    const user = userEvent.setup();
    const mockCategories = [{ id: 1, name: 'Original Name' }];
    
    vi.mocked(CategoriesService.getAll).mockResolvedValue(mockCategories);

    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByText('Original Name')).toBeInTheDocument();
    });

    const editButton = screen.getByTitle('Editar');
    await user.click(editButton);

    // In edit mode, the name appears in an input
    const editInput = screen.getByDisplayValue('Original Name');
    expect(editInput).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);

    // Back to display mode
    await waitFor(() => {
      expect(screen.getByText('Original Name')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Original Name')).not.toBeInTheDocument();
    });
  });
});

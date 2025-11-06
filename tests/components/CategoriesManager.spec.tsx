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

  it('loads and displays categories', async () => {
    const mockCategories = [
      { id: 1, name: 'Comida', description: '', isActive: true },
      { id: 2, name: 'Transporte', description: '', isActive: true },
    ];

    vi.mocked(CategoriesService.getAll).mockResolvedValue({
      data: mockCategories,
    } as any);

    render(<CategoriesManager />);

    // Should show loading initially
    expect(screen.getByText('Cargando categorías...')).toBeInTheDocument();

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByText('Comida')).toBeInTheDocument();
    });

    expect(screen.getByText('Transporte')).toBeInTheDocument();
    expect(CategoriesService.getAll).toHaveBeenCalledTimes(1);
  });

  it('creates a new category', async () => {
    const mockCategories = [
      { id: 1, name: 'Comida', description: '', isActive: true },
    ];

    const newCategory = { id: 2, name: 'Entretenimiento', description: '', isActive: true };

    vi.mocked(CategoriesService.getAll).mockResolvedValue({
      data: mockCategories,
    } as any);

    vi.mocked(CategoriesService.create).mockResolvedValue({
      data: newCategory,
    } as any);

    const user = userEvent.setup();
    render(<CategoriesManager />);

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByText('Comida')).toBeInTheDocument();
    });

    // Click "Nueva Categoría" button
    const newButton = screen.getByRole('button', { name: /Nueva Categoría/i });
    await user.click(newButton);

    // Type new category name
    const input = screen.getByPlaceholderText('Nombre de la categoría');
    await user.type(input, 'Entretenimiento');

    // Click create button
    const createButton = screen.getByRole('button', { name: /Crear/i });
    await user.click(createButton);

    // Check that CategoriesService.create was called
    await waitFor(() => {
      expect(CategoriesService.create).toHaveBeenCalledWith({
        name: 'Entretenimiento',
        description: '',
        isActive: true,
      });
    });

    // Check that new category is displayed
    expect(screen.getByText('Entretenimiento')).toBeInTheDocument();
  });

  it('shows error message when loading fails', async () => {
    vi.mocked(CategoriesService.getAll).mockRejectedValue(new Error('Network error'));

    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar las categorías')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
  });

  it('shows empty state when no categories exist', async () => {
    vi.mocked(CategoriesService.getAll).mockResolvedValue({
      data: [],
    } as any);

    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByText('No hay categorías. Crea una para comenzar.')).toBeInTheDocument();
    });
  });

  it('updates a category', async () => {
    const mockCategories = [
      { id: 1, name: 'Comida', description: '', isActive: true },
    ];

    vi.mocked(CategoriesService.getAll).mockResolvedValue({
      data: mockCategories,
    } as any);

    vi.mocked(CategoriesService.update).mockResolvedValue({} as any);

    const user = userEvent.setup();
    render(<CategoriesManager />);

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByText('Comida')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByTitle('Editar');
    await user.click(editButton);

    // Update the name
    const input = screen.getByDisplayValue('Comida');
    await user.clear(input);
    await user.type(input, 'Alimentos');

    // Click save button
    const saveButton = screen.getByRole('button', { name: /Guardar/i });
    await user.click(saveButton);

    // Check that CategoriesService.update was called
    await waitFor(() => {
      expect(CategoriesService.update).toHaveBeenCalledWith(1, { name: 'Alimentos' });
    });

    // Check that updated category is displayed
    expect(screen.getByText('Alimentos')).toBeInTheDocument();
  });

  it('deletes a category', async () => {
    const mockCategories = [
      { id: 1, name: 'Comida', description: '', isActive: true },
      { id: 2, name: 'Transporte', description: '', isActive: true },
    ];

    vi.mocked(CategoriesService.getAll).mockResolvedValue({
      data: mockCategories,
    } as any);

    vi.mocked(CategoriesService.delete).mockResolvedValue({} as any);

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    render(<CategoriesManager />);

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByText('Comida')).toBeInTheDocument();
    });

    // Click delete button for first category
    const deleteButtons = screen.getAllByTitle('Eliminar');
    await user.click(deleteButtons[0]);

    // Check that confirm was called
    expect(confirmSpy).toHaveBeenCalledWith('¿Estás seguro de que deseas eliminar esta categoría?');

    // Check that CategoriesService.delete was called
    await waitFor(() => {
      expect(CategoriesService.delete).toHaveBeenCalledWith(1);
    });

    // Check that category is removed from display
    await waitFor(() => {
      expect(screen.queryByText('Comida')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Transporte')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });
});

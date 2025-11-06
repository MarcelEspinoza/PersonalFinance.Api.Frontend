import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoriesManager from '../../src/components/Settings/CategoriesManager';
import { CategoriesService } from '../../src/services/categoriesService';

vi.mock('../../src/services/categoriesService');

describe('CategoriesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays categories on mount', async () => {
    const mockCategories = [
      { id: 1, name: 'Alimentación', description: 'Comida y bebida', isActive: true },
      { id: 2, name: 'Transporte', description: 'Gasolina y transporte', isActive: true },
    ];
    vi.mocked(CategoriesService.getAll).mockResolvedValue({ data: mockCategories } as any);

    render(<CategoriesManager />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Alimentación')).toBeInTheDocument();
    });

    expect(screen.getByText('Comida y bebida')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
    expect(screen.getByText('Gasolina y transporte')).toBeInTheDocument();
  });

  it('displays empty state when no categories exist', async () => {
    vi.mocked(CategoriesService.getAll).mockResolvedValue({ data: [] } as any);

    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByText('No hay categorías aún.')).toBeInTheDocument();
    });
  });

  it('creates a new category when form is submitted', async () => {
    vi.mocked(CategoriesService.getAll).mockResolvedValue({ data: [] } as any);
    vi.mocked(CategoriesService.create).mockResolvedValue({ data: { id: 1, name: 'Nueva', description: 'Test' } } as any);

    const user = userEvent.setup();
    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByText('No hay categorías aún.')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Ej: Alimentación');
    const descInput = screen.getByPlaceholderText('Opcional');
    const createButton = screen.getByText('Crear');

    await user.type(nameInput, 'Nueva');
    await user.type(descInput, 'Test');
    await user.click(createButton);

    await waitFor(() => {
      expect(CategoriesService.create).toHaveBeenCalledWith({
        name: 'Nueva',
        description: 'Test',
        isActive: true,
      });
    });
  });

  it('shows error when trying to create category without name', async () => {
    vi.mocked(CategoriesService.getAll).mockResolvedValue({ data: [] } as any);

    const user = userEvent.setup();
    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByText('No hay categorías aún.')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Crear');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    });

    expect(CategoriesService.create).not.toHaveBeenCalled();
  });

  it('handles axios response shape with data property', async () => {
    const mockCategories = [{ id: 1, name: 'Test', isActive: true }];
    vi.mocked(CategoriesService.getAll).mockResolvedValue({ data: mockCategories } as any);

    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  it('handles direct array response shape', async () => {
    const mockCategories = [{ id: 1, name: 'Test', isActive: true }];
    vi.mocked(CategoriesService.getAll).mockResolvedValue(mockCategories as any);

    render(<CategoriesManager />);

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });
});

import type { Category } from "@/services/api";
import { useAuthStore } from "@/stores";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "./use-categories";

/**
 * Quem pode excluir categoria. O DELETE /categories/:id é Deny pra manager
 * no backend (RBAC 5.4), embora ele crie e edite - mostrar o botão pra ele
 * só levava a um 403. Lista de quem pode, e não de quem não pode, pra role
 * nova não herdar o botão por omissão.
 */
const CATEGORY_DELETE_ROLES = ["owner", "admin"];

interface CategoryFormData {
  name: string;
  description: string;
}

export const useCategoryManagement = () => {
  const { data: categories = [], isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { user } = useAuthStore();
  const canDelete = CATEGORY_DELETE_ROLES.includes(user?.role ?? "");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    description: "",
  });
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = categories.filter(
    (category: Category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
    });
  };

  const updateFormField = (field: keyof CategoryFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return false;
    }

    if (formData.name.trim().length < 3) {
      toast.error("Nome deve ter pelo menos 3 caracteres");
      return false;
    }

    if (formData.name.trim().length > 50) {
      toast.error("Nome da categoria deve ter no máximo 50 caracteres");
      return false;
    }

    if (formData.description.trim().length > 200) {
      toast.error("Descrição deve ter no máximo 200 caracteres");
      return false;
    }

    return true;
  };

  const handleSaveCategory = async () => {
    if (!validateForm()) return;

    try {
      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
      };

      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          data: categoryData,
        });
      } else {
        await createCategory.mutateAsync(categoryData);
      }

      handleCloseModal();
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
    }
  };

  const handleRequestDelete = (category: Category) => {
    if (!canDelete) return;
    setDeleteTarget(category);
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !canDelete) return;

    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Erro ao deletar categoria:", error);
    }
  };

  return {
    categories: filteredCategories,
    allCategories: categories,
    isLoading,

    isModalOpen,
    editingCategory,
    deleteTarget,
    formData,

    searchQuery,
    setSearchQuery,

    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
    handleSaveCategory,
    handleRequestDelete,
    handleConfirmDelete,
    handleCancelDelete,
    canDelete,
    updateFormField,
    isSaving: createCategory.isPending || updateCategory.isPending,
    isDeleting: deleteCategory.isPending,
  };
};

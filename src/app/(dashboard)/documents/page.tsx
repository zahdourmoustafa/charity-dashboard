"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FolderPlus, ArrowLeft, FileText, Grid, List } from "lucide-react";
import { DocumentUpload } from "@/components/documents/document-upload";
import { DocumentList } from "@/components/documents/document-list";
import { CategoryCard } from "@/components/documents/category-card";
import { CategoryDialog } from "@/components/documents/category-dialog";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

// Force dynamic rendering to prevent build-time Convex queries
export const dynamic = 'force-dynamic';

export default function DocumentsPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Id<"categories"> | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ _id: Id<"categories">; nameGerman: string } | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const categoriesWithCounts = useQuery(api.categories.listWithCounts) || [];
  const documents = useQuery(
    api.documents.list,
    selectedCategory ? { category: selectedCategory } : {}
  ) || [];
  const removeCategory = useMutation(api.categories.remove);

  // Show loading state if data is still loading
  if (categoriesWithCounts === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Daten...</p>
        </div>
      </div>
    );
  }

  const selectedCategoryData = categoriesWithCounts?.find(
    (c) => c._id === selectedCategory
  );

  const handleDeleteCategory = async (categoryId: Id<"categories">) => {
    if (!confirm("Möchten Sie diese Kategorie wirklich löschen?")) return;

    try {
      await removeCategory({ id: categoryId });
      toast.success("Kategorie gelöscht");
    } catch {
      toast.error("Kategorie kann nicht gelöscht werden (enthält Dokumente)");
    }
  };

  // Category overview view
  if (!selectedCategory) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dokumente</h1>
            <p className="text-muted-foreground">
              Organisieren Sie Ihre Praxisdokumente in Kategorien
            </p>
          </div>
          <Button onClick={() => setShowCategoryDialog(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Neue Kategorie
          </Button>
        </div>

        {/* Category Dialog */}
        <CategoryDialog
          open={showCategoryDialog}
          onClose={() => {
            setShowCategoryDialog(false);
            setEditingCategory(null);
          }}
          category={editingCategory}
        />

        {/* Categories Grid */}
        {categoriesWithCounts === undefined ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Laden...</p>
          </div>
        ) : categoriesWithCounts.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12">
            <FolderPlus className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Keine Kategorien</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Erstellen Sie Ihre erste Kategorie
            </p>
            <Button className="mt-4" onClick={() => setShowCategoryDialog(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Kategorie erstellen
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoriesWithCounts.map((category) => (
              <CategoryCard
                key={category._id}
                category={category}
                onClick={() => setSelectedCategory(category._id)}
                onEdit={() => {
                  setEditingCategory({
                    _id: category._id,
                    nameGerman: category.nameGerman,
                  });
                  setShowCategoryDialog(true);
                }}
                onDelete={() => handleDeleteCategory(category._id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Documents view (inside category)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          className="w-fit"
          onClick={() => setSelectedCategory(null)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zu Kategorien
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{selectedCategoryData?.nameGerman}</h1>
            <p className="text-muted-foreground">
              {documents?.length || 0} {documents?.length === 1 ? "Dokument" : "Dokumente"}
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Dokument hochladen
          </Button>
        </div>
      </div>

      {/* Upload Dialog */}
      {showUpload && (
        <DocumentUpload
          open={showUpload}
          onClose={() => setShowUpload(false)}
          categories={categoriesWithCounts || []}
          defaultCategory={selectedCategory}
        />
      )}

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {documents?.length || 0} Dokumente
        </p>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Documents List */}
      {documents === undefined ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      ) : documents.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Keine Dokumente</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Laden Sie Ihr erstes Dokument in diese Kategorie hoch
          </p>
          <Button className="mt-4" onClick={() => setShowUpload(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Dokument hochladen
          </Button>
        </Card>
      ) : (
        <DocumentList documents={documents} viewMode={viewMode} />
      )}
    </div>
  );
}

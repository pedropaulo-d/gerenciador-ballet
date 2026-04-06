"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { Location } from "@/types/database";
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "@/app/actions/locations";
import {
  LocationForm,
  locationToFormData,
  formDataToPayload,
  type LocationFormData,
} from "@/components/locations/location-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  MapPinIcon,
  BanknoteIcon,
  LoaderIcon,
} from "lucide-react";

export function LocationList() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado dos dialogs
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    const result = await getLocations();
    if (result.success) {
      setLocations(result.data);
    } else {
      toast.error("Erro ao carregar locais", { description: result.error });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // -- Handlers de abertura dos dialogs --

  function openCreate() {
    setEditingLocation(null);
    setFormDialogOpen(true);
  }

  function openEdit(location: Location) {
    setEditingLocation(location);
    setFormDialogOpen(true);
  }

  function openDelete(location: Location) {
    setDeletingLocation(location);
    setDeleteDialogOpen(true);
  }

  // -- Handlers de ação --

  async function handleFormSubmit(formData: LocationFormData) {
    const payload = formDataToPayload(formData);

    const result = editingLocation
      ? await updateLocation(editingLocation.id, payload)
      : await createLocation(payload);

    if (!result.success) {
      toast.error("Erro ao salvar local", { description: result.error });
      return;
    }

    toast.success(editingLocation ? "Local atualizado!" : "Local cadastrado!");
    setFormDialogOpen(false);
    fetchLocations();
  }

  async function handleDelete() {
    if (!deletingLocation) return;
    setDeleting(true);

    const result = await deleteLocation(deletingLocation.id);
    setDeleting(false);

    if (!result.success) {
      toast.error("Erro ao excluir local", { description: result.error });
      return;
    }

    toast.success("Local excluído!");
    setDeleteDialogOpen(false);
    setDeletingLocation(null);
    fetchLocations();
  }

  // -- Render --

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Locais</h1>
        <Button onClick={openCreate} size="sm">
          <PlusIcon data-icon="inline-start" />
          Novo Local
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : locations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <MapPinIcon className="size-10 opacity-50" />
          <p>Nenhum local cadastrado.</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            Cadastrar primeiro local
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {locations.map((location) => (
            <Card key={location.id} size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {location.name}
                  {!location.is_active && (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </CardTitle>
                <CardAction>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => openEdit(location)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => openDelete(location)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                {location.address && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="size-3.5 shrink-0" />
                    <span>{location.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <BanknoteIcon className="size-3.5 shrink-0" />
                  <span>
                    Taxa: R$ {Number(location.fee_per_student).toFixed(2)} / aluna
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: Criar / Editar */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Editar Local" : "Novo Local"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation
                ? "Atualize os dados do local parceiro."
                : "Preencha os dados do novo local parceiro."}
            </DialogDescription>
          </DialogHeader>

          <LocationForm
            key={editingLocation?.id ?? "new"}
            initialData={
              editingLocation ? locationToFormData(editingLocation) : undefined
            }
            isEditing={!!editingLocation}
            onSubmit={handleFormSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Local</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              <strong>{deletingLocation?.name}</strong>? Todas as turmas
              vinculadas também serão removidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

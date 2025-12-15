"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface AttendanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentName: string
  status: "absent" | "late"
  defaultPercentage: number
  onSubmit: (justification: string, percentage: number) => void
}

export function AttendanceDialog({
  open,
  onOpenChange,
  studentName,
  status,
  defaultPercentage,
  onSubmit,
}: AttendanceDialogProps) {
  const [justification, setJustification] = useState("")
  const [percentage, setPercentage] = useState(defaultPercentage.toString())

  const handleSubmit = () => {
    const validPercentage = Math.min(100, Math.max(0, Number(percentage) || defaultPercentage))
    onSubmit(justification, validPercentage)
    // Reset form
    setJustification("")
    setPercentage(defaultPercentage.toString())
    onOpenChange(false)
  }

  const handleCancel = () => {
    // Reset form
    setJustification("")
    setPercentage(defaultPercentage.toString())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Marquer {status === "absent" ? "absent" : "en retard"} - {studentName}
          </DialogTitle>
          <DialogDescription>
            Fournissez les détails de l&apos;{status === "absent" ? "absence" : "arrivée tardive"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="justification">
              Justification (optionnel)
            </Label>
            <Textarea
              id="justification"
              placeholder="Raison de l'absence ou du retard..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentage">
              Pourcentage de présence (0-100)
            </Label>
            <Input
              id="percentage"
              type="number"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              placeholder={defaultPercentage.toString()}
            />
            <p className="text-xs text-zinc-500">
              Valeur par défaut: {defaultPercentage}%
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

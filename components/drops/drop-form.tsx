"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { DropStatusBadge } from "@/components/drops/drop-status-badge"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DropStatus } from "@/lib/generated/prisma/enums"
import { createDrop, updateDrop } from "@/lib/actions/drops"
import {
  createDropSchema,
  updateDropSchema,
  type CreateDropInput,
  type UpdateDropInput,
} from "@/lib/validations/drops"

type DriverOption = {
  id: string
  name: string
}

type DropFormValues = CreateDropInput & {
  id?: string
  status?: DropStatus
}

type DropFormProps = {
  mode: "create" | "edit"
  drivers: DriverOption[]
  defaultValues?: Partial<DropFormValues>
}

export function DropForm({ mode, drivers, defaultValues }: DropFormProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const schema = mode === "create" ? createDropSchema : updateDropSchema

  const form = useForm<DropFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dropNumber: defaultValues?.dropNumber ?? "",
      postcode: defaultValues?.postcode ?? "",
      location: defaultValues?.location ?? "",
      notes: defaultValues?.notes ?? "",
      assignedDriverId: defaultValues?.assignedDriverId ?? null,
      status: defaultValues?.status ?? DropStatus.PENDING,
      id: defaultValues?.id,
    },
  })

  async function onSubmit(values: DropFormValues) {
    setFormError(null)

    const result =
      mode === "create"
        ? await createDrop(values as CreateDropInput)
        : await updateDrop(values as UpdateDropInput)

    if (!result.success) {
      setFormError(result.error)
      return
    }

    router.push("/drops")
    router.refresh()
  }

  const currentStatus = form.watch("status")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {mode === "edit" && currentStatus ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <DropStatusBadge status={currentStatus} />
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="dropNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Drop number</FormLabel>
                <FormControl>
                  <Input placeholder="123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="postcode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postcode</FormLabel>
                <FormControl>
                  <Input placeholder="IP4 1LS" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Optional location details"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assignedDriverId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Assigned driver</FormLabel>
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? null : value)
                  }
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a driver" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Optional notes for the driver"
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {formError ? (
          <p className="text-sm font-medium text-destructive">{formError}</p>
        ) : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "Saving..."
              : mode === "create"
                ? "Create drop"
                : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/drops")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}

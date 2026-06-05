"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { createDriver, updateDriver } from "@/lib/actions/drivers"
import {
  createDriverSchema,
  updateDriverSchema,
} from "@/lib/validations/drivers"
import { z } from "zod"

const driverFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  phoneNumber: z.string().trim().min(1, "Phone number is required"),
  area: z.string().optional(),
  preferredPostcodes: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

type DriverFormValues = z.infer<typeof driverFormSchema>

type DriverFormProps = {
  mode: "create" | "edit"
  defaultValues?: Partial<DriverFormValues>
}

export function DriverForm({ mode, defaultValues }: DriverFormProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      phoneNumber: defaultValues?.phoneNumber ?? "",
      area: defaultValues?.area ?? "",
      preferredPostcodes:
        typeof defaultValues?.preferredPostcodes === "string"
          ? defaultValues.preferredPostcodes
          : "",
      notes: defaultValues?.notes ?? "",
      isActive: defaultValues?.isActive ?? true,
      id: defaultValues?.id,
    },
  })

  async function onSubmit(values: DriverFormValues) {
    setFormError(null)

    const payload = {
      ...values,
      area: values.area || null,
      notes: values.notes || null,
      preferredPostcodes: values.preferredPostcodes ?? "",
      isActive: values.isActive ?? true,
    }

    if (mode === "create") {
      const parsed = createDriverSchema.safeParse(payload)
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? "Invalid input")
        return
      }
      const result = await createDriver(parsed.data)
      if (!result.success) {
        setFormError(result.error)
        return
      }
    } else {
      const parsed = updateDriverSchema.safeParse(payload)
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? "Invalid input")
        return
      }
      const result = await updateDriver(parsed.data)
      if (!result.success) {
        setFormError(result.error)
        return
      }
    }

    router.push("/drivers")
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input placeholder="07123 456789" {...field} />
                </FormControl>
                <FormDescription>UK numbers are normalized to E.164.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Area</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ipswich"
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
            name="preferredPostcodes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Preferred postcodes</FormLabel>
                <FormControl>
                  <Input
                    placeholder="IP1, IP2, IP4"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>Comma-separated postcodes.</FormDescription>
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
                    placeholder="Optional notes about this driver"
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {mode === "edit" ? (
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 md:col-span-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div>
                    <FormLabel className="mb-0">Active driver</FormLabel>
                    <FormDescription>
                      Inactive drivers are hidden from assignment lists.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          ) : null}
        </div>

        {formError ? (
          <p className="text-sm font-medium text-destructive">{formError}</p>
        ) : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "Saving..."
              : mode === "create"
                ? "Create driver"
                : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/drivers")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}

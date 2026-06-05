"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

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
import { updateSettings } from "@/lib/actions/settings"
import {
  updateSettingsSchema,
  type UpdateSettingsInput,
} from "@/lib/validations/settings"

type SettingsFormProps = {
  defaultValues: UpdateSettingsInput
}

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<UpdateSettingsInput>({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: {
      whatsappTemplateName: defaultValues.whatsappTemplateName,
      defaultMessageText: defaultValues.defaultMessageText,
      defaultNotes: defaultValues.defaultNotes ?? "",
      businessName: defaultValues.businessName ?? "",
      managerName: defaultValues.managerName ?? "",
    },
  })

  async function onSubmit(values: UpdateSettingsInput) {
    setFormError(null)

    const parsed = updateSettingsSchema.safeParse(values)
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Invalid input")
      return
    }

    const result = await updateSettings(parsed.data)
    if (!result.success) {
      setFormError(result.error)
      toast.error(result.error)
      return
    }

    toast.success("Settings saved")
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="whatsappTemplateName"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>WhatsApp template name</FormLabel>
                <FormControl>
                  <Input placeholder="evri_drop_notification" {...field} />
                </FormControl>
                <FormDescription>
                  Must match your Meta-approved template name exactly.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="businessName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Evri Logistics"
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
            name="managerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Manager name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Alex Manager"
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
            name="defaultNotes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Default drop notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Applied to new drops when notes are left empty"
                    rows={2}
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
            name="defaultMessageText"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Default message text</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Hi {{driverName}}, your Evri drop for tonight..."
                    rows={8}
                    className="font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Used for message previews and logs. Placeholders:{" "}
                  <code>{"{{driverName}}"}</code>,{" "}
                  <code>{"{{dropNumber}}"}</code>,{" "}
                  <code>{"{{postcode}}"}</code>, <code>{"{{notes}}"}</code>.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {formError ? (
          <p className="text-sm font-medium text-destructive">{formError}</p>
        ) : null}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save settings"}
        </Button>
      </form>
    </Form>
  )
}

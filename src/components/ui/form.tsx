"use client"

import { useForm, FormProvider, FieldPath } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

export interface FormProps {
  children: React.ReactNode
  onSubmit: (data: any) => void
  className?: string
}

export function Form({ children, onSubmit, className }: FormProps) {
  const methods = useForm()

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className={cn("space-y-6", className)}>
        {children}
      </form>
    </FormProvider>
  )
}

export interface FormFieldProps {
  name: string
  label?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ name, label, description, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={name} className="text-sm font-medium">
          {label}
        </Label>
      )}
      {children}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
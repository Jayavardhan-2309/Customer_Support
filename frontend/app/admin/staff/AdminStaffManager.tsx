import { Staff } from "@/types/customTypes"
import { AdminStaffForm } from "./AdminStaffForm"
import { AdminStaffList } from "./AdminStaffList"

type Props = {
  readonly addStaff: () => void
  readonly availableCount: number
  readonly deletePendingId?: number
  readonly email: string
  readonly isAdding: boolean
  readonly loadingStaff: boolean
  readonly name: string
  readonly onDelete: (id: number, username: string) => void
  readonly onToggle: (id: number) => void
  readonly password: string
  readonly setEmail: (value: string) => void
  readonly setName: (value: string) => void
  readonly setPassword: (value: string) => void
  readonly staff: Staff[]
  readonly togglePendingId?: number
}

export function AdminStaffManager({
  addStaff,
  availableCount,
  deletePendingId,
  email,
  isAdding,
  loadingStaff,
  name,
  onDelete,
  onToggle,
  password,
  setEmail,
  setName,
  setPassword,
  staff,
  togglePendingId,
}: Props) {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10">
      <AdminStaffForm
        addStaff={addStaff}
        email={email}
        isAdding={isAdding}
        name={name}
        password={password}
        setEmail={setEmail}
        setName={setName}
        setPassword={setPassword}
      />
      <AdminStaffList
        availableCount={availableCount}
        deletePendingId={deletePendingId}
        loadingStaff={loadingStaff}
        onDelete={onDelete}
        onToggle={onToggle}
        staff={staff}
        togglePendingId={togglePendingId}
      />
    </main>
  )
}

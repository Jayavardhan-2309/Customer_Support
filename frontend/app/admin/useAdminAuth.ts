import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAbortableApiData } from "@/src/lib/useAbortableApiData"
import { Me } from "@/types/customTypes"

export function useAdminAuth() {
  const router = useRouter()
  const { data: me, error, isLoading } = useAbortableApiData<Me>("me/", {
    onError: () => router.replace("/login"),
  })

  useEffect(() => {
    if (me && me.role !== "admin") {
      router.replace("/support")
    }
  }, [me, router])

  return { checkingAuth: isLoading || Boolean(error) || me?.role !== "admin", orgName: me?.organization_name || "" }
}

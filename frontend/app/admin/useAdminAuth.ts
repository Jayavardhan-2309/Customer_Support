import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { safeFetch } from "@/src/lib/safeFetch"

export function useAdminAuth() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [orgName, setOrgName] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    void safeFetch("/api/me", { credentials: "include", signal: controller.signal }).then(async (res) => {
      if (controller.signal.aborted) {
        return
      }
      if (!res.ok) {
        router.replace("/login")
        return
      }
      const data = await res.json()
      if (data.role !== "admin") {
        router.replace("/support")
        return
      }
      setOrgName(data.organization_name || "")
      setCheckingAuth(false)
    })

    return () => controller.abort()
  }, [router])

  return { checkingAuth, orgName }
}

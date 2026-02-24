export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-100 font-sans">
            <div
                className="relative flex flex-col w-full max-w-md bg-[#faf9f6] shadow-2xl overflow-hidden"
                style={{ height: "100dvh", maxHeight: "100dvh" }}
            >
                <div className="flex-1 overflow-y-auto px-6 py-12 scrollbar-hide">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#faf9f6] px-4 font-sans">
            <div className="w-full max-w-[420px] py-12">
                {children}
            </div>
        </div>
    );
}

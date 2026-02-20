"use client";

import { ChevronLeft, Mail, Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionCardProps {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    subtitle: string;
    onClick: () => void;
}

function ActionCard({ icon, iconBg, title, subtitle, onClick }: ActionCardProps) {
    return (
        <div className="bg-white border-y sm:border sm:rounded-2xl border-gray-200">
            <button
                onClick={onClick}
                className="w-full px-4 py-5 sm:p-6 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            >
                <div className="flex items-center gap-4">
                    <div
                        className="w-12 h-12 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: iconBg }}
                    >
                        {icon}
                    </div>
                    <div className="text-left min-w-0">
                        <h3 className="font-medium text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-500 truncate">{subtitle}</p>
                    </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180 flex-shrink-0" />
            </button>
        </div>
    );
}

interface EmailCardProps {
    email: string;
    onClick: () => void;
}

export function EmailCard({ email, onClick }: EmailCardProps) {
    return (
        <ActionCard
            icon={<Mail className="w-6 h-6 sm:w-5 sm:h-5 text-blue-600" />}
            iconBg="#DBEAFE"
            title="Email Address"
            subtitle={email}
            onClick={onClick}
        />
    );
}

interface PasswordCardProps {
    onClick: () => void;
}

export function PasswordCard({ onClick }: PasswordCardProps) {
    return (
        <ActionCard
            icon={<Lock className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600" />}
            iconBg="#F3F4F6"
            title="Password"
            subtitle="Keep your account secure"
            onClick={onClick}
        />
    );
}

interface DangerZoneProps {
    onDelete: () => void;
}

export function DangerZone({ onDelete }: DangerZoneProps) {
    return (
        <div className="bg-white border-y sm:border sm:rounded-2xl border-red-200 overflow-hidden">
            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-red-50 border-b border-red-200">
                <h3 className="font-medium text-red-800">Danger Zone</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h4 className="font-medium text-gray-900">Delete Account</h4>
                        <p className="text-sm text-gray-500">
                            Permanently delete your account and all data
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={onDelete}
                        className="h-12 sm:h-10 text-red-600 border-red-300 hover:bg-red-50 active:bg-red-100 rounded-xl touch-manipulation"
                    >
                        <Trash2 className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                        Delete Account
                    </Button>
                </div>
            </div>
        </div>
    );
}
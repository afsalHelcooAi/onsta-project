import React from 'react';
import { useTranslation } from 'react-i18next';
import AppIcon from '../common/AppIcon';
import BrandLogo from '../common/BrandLogo';
import LanguageSwitcher from '../common/LanguageSwitcher';

export default function AdminSidebar({ activeTab, setActiveTab, pendingCount = 0, onSignOut }) {
  const { t } = useTranslation();
  const menuItems = [
    { id: 'overview', label: t('sidebar.overview'), icon: 'overview' },
    { id: 'master-catalog', label: t('sidebar.masterCatalog'), icon: 'ai' },
    { id: 'review-queue', label: t('sidebar.reviewQueue'), icon: 'shield-check', badge: pendingCount },
    { id: 'all-clinics', label: t('sidebar.allClinics'), icon: 'hospital' },
    { id: 'compliance-audit', label: t('sidebar.complianceAudit'), icon: 'file-contract' },
    { id: 'all-users', label: t('sidebar.allUsers'), icon: 'users' },
    { id: 'audit-logs', label: t('sidebar.auditLogs'), icon: 'scroll' },
  ];

  return (
    <aside className="w-64 bg-theme-sidebar-bg text-white flex flex-col justify-between h-screen border-e border-theme-sidebar-border shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-theme-sidebar-border">
          <div className="flex items-center gap-3">
            <BrandLogo className="w-10 h-10 rounded-xl shadow-sm ring-1 ring-white/15" />
            <div>
              <h1 className="alata-regular text-sm tracking-wide text-theme-sidebar-heading">{t('sidebar.title')}</h1>
              <p className="text-[10px] font-medium uppercase tracking-wider text-theme-sidebar-kicker">{t('sidebar.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3.5 space-y-1.5 mt-1">
          <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-theme-sidebar-muted uppercase">
            {t('sidebar.sectionTitle')}
          </div>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-theme-card text-theme-ink alata-regular shadow-md'
                    : 'text-theme-sidebar-text hover:text-white hover:bg-theme-sidebar-hover font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AppIcon
                    name={item.icon}
                    weight={isActive ? 'duotone' : 'regular'}
                    className={`w-4 text-center text-base ${
                      isActive ? 'text-theme-primary' : 'text-theme-sidebar-muted'
                    }`}
                  />
                  <span className={isActive ? 'alata-regular' : ''}>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-[11px] alata-regular rounded-full ${
                    isActive
                      ? 'bg-theme-primary text-white'
                      : 'bg-theme-primary-soft text-theme-primary'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Language Switcher & Log Out Button */}
      <div className="p-4 border-t border-theme-sidebar-border space-y-3">
        <div className="flex justify-center">
          <LanguageSwitcher variant="sidebar" />
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-xl text-xs alata-regular tracking-wide text-theme-sidebar-logout-text bg-theme-sidebar-logout-bg hover:bg-theme-primary hover:text-white border border-theme-sidebar-logout-border transition-all shadow-sm group"
        >
          <AppIcon
            name="sign-out"
            className="text-base text-theme-sidebar-logout-icon group-hover:text-white transition-colors"
          />
          <span>{t('sidebar.logOut')}</span>
        </button>
      </div>
    </aside>
  );
}

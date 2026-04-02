export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import {
  FolderOpen, Clock, Play, StickyNote, Camera, Map,
  FileStack, Users, BarChart3, Download, Plus, CheckSquare,
  Smartphone, Monitor, Zap, DollarSign, CalendarDays,
  CloudSun, Bell, ClipboardCheck
} from 'lucide-react'

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-[#68BD45]/10 rounded-lg flex-shrink-0">
          <Icon className="w-5 h-5 text-[#68BD45]" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
          <div className="text-sm text-gray-700 space-y-2">{children}</div>
        </div>
      </div>
    </Card>
  )
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#68BD45] text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {number}
      </span>
      <p>{children}</p>
    </div>
  )
}

export default async function HelpPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <div>
      <PageHeader title="How to Use Blue Shores PM" />
      <div className="p-4 md:p-6 max-w-3xl">

        <div className="mb-6">
          <p className="text-gray-600">
            Blue Shores PM helps you track projects, log time, capture photos, and annotate blueprints.
            {isAdmin ? ' As an admin, you can also manage templates, users, and view reports.' : ''}
          </p>
        </div>

        {/* Getting Around */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Getting Around</h3>

        <Section icon={Monitor} title="Navigation">
          <p><strong>On desktop:</strong> Use the sidebar on the left to switch between pages.</p>
          <p><strong>On mobile:</strong> Use the bottom navigation bar. Tap any icon to jump to that section.</p>
        </Section>

        {/* Projects */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-8">Projects</h3>

        <Section icon={FolderOpen} title="Viewing Projects">
          <p>The <strong>Dashboard</strong> shows all active projects at a glance with progress bars. Tap any project to open it.</p>
          <p>The <strong>Projects</strong> page shows all projects (active, completed, and archived).</p>
        </Section>

        {isAdmin && (
          <Section icon={Plus} title="Creating a Project">
            <Step number={1}>Go to <strong>Projects</strong> and tap <strong>+ New Project</strong>.</Step>
            <Step number={2}>Enter the project name and address.</Step>
            <Step number={3}>Optionally pick a template to pre-fill phases (e.g., Rough-in, Trim-out, Final).</Step>
            <Step number={4}>Tap <strong>Create Project</strong>.</Step>
          </Section>
        )}

        <Section icon={Zap} title="Project Phases">
          <p>Each project has <strong>phases</strong> shown in a pipeline at the top (e.g., Rough-in → Trim-out → Final).</p>
          <p>Phases show their status: <strong>Not Started</strong>, <strong>In Progress</strong>, or <strong>Complete</strong>.</p>
          {isAdmin && <p>As admin, you can change a phase's status by expanding it and tapping the status buttons.</p>}
          <p>Tasks within each phase can be checked off by anyone on the crew.</p>
        </Section>

        {/* Time Tracking */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-8">Time Tracking</h3>

        <Section icon={Play} title="Clocking In & Out">
          <Step number={1}>Open a project.</Step>
          <Step number={2}>Tap the green <strong>Clock In</strong> button.</Step>
          <Step number={3}>A live timer starts counting. You can navigate to other pages — the timer keeps running.</Step>
          <Step number={4}>When done, return to the project and tap <strong>Clock Out</strong>.</Step>
          <p className="text-gray-500 mt-1">The time entry is automatically saved with the exact start and end time.</p>
          <p className="text-gray-500">You can only be clocked in to one project at a time.</p>
        </Section>

        <Section icon={Clock} title="Manual Time Entry">
          <Step number={1}>Open a project and tap <strong>Log Time</strong> (or <strong>+ Manual Entry</strong>).</Step>
          <Step number={2}>Enter the date, hours, and minutes worked.</Step>
          <Step number={3}>Optionally select which phase the work was for and add notes.</Step>
          <Step number={4}>Tap <strong>Add Time Entry</strong>.</Step>
        </Section>

        <Section icon={Smartphone} title="My Time">
          <p>The <strong>My Time</strong> page shows your personal time log for the current week, with a total at the top.</p>
        </Section>

        {/* Field Documentation */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-8">Field Documentation</h3>

        <Section icon={StickyNote} title="Adding Notes">
          <p>Open a project and type in the note box under the <strong>Notes</strong> section, then tap the send button.</p>
          <p><strong>On mobile:</strong> Tap the <strong>Note</strong> button in the bottom action bar to open the note form.</p>
          <p>Notes show who wrote them and when.</p>
        </Section>

        <Section icon={Camera} title="Taking Photos">
          <p><strong>On mobile:</strong> Tap the <strong>Photo</strong> button in the bottom action bar. Your camera opens directly.</p>
          <p><strong>On desktop:</strong> Tap <strong>Upload</strong> to select a photo from your computer.</p>
          <p>Photos appear in a grid. Tap any photo to view it full-size.</p>
          {isAdmin && (
            <>
              <p><strong>Deleting photos:</strong> Tap a photo to open it, then tap <strong>Delete</strong>.</p>
              <p><strong>Bulk delete:</strong> Tap <strong>Select</strong> above the photo grid, check the photos you want to remove, then tap <strong>Delete</strong>.</p>
            </>
          )}
        </Section>

        {/* Blueprints */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-8">Blueprints</h3>

        <Section icon={Map} title="Blueprint Annotation">
          <p>Open a project and go to <strong>Plans</strong> to view uploaded blueprints.</p>
          {isAdmin && (
            <>
              <Step number={1}>Tap <strong>Upload Plan</strong> and drag in a PDF, PNG, or JPG blueprint.</Step>
              <Step number={2}>Give it a name (e.g., "Main Floor Electrical") and tap <strong>Upload</strong>.</Step>
            </>
          )}
          <p>Once uploaded, tap a plan to open the annotation canvas where you can:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Place electrical symbols</strong> — outlets, switches, panels, junction boxes, lights, wire runs</li>
            <li><strong>Draw freehand</strong> — mark up areas with your finger or mouse</li>
            <li><strong>Add text labels</strong> — label circuits, gauges, or notes</li>
            <li><strong>Color code</strong> — use different wire colors (black for 120V, red for 220V, blue for low voltage, etc.)</li>
          </ul>
          <p className="mt-1"><strong>Zoom:</strong> Pinch to zoom on mobile, scroll wheel on desktop.</p>
          <p>Tap <strong>Save</strong> to save your annotations. They persist across sessions.</p>
        </Section>

        {/* Expenses */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-8">Expenses & Materials</h3>

        <Section icon={DollarSign} title="Tracking Expenses">
          <p>Open a project and scroll to the <strong>Expenses</strong> section to see all costs for that job.</p>
          <Step number={1}>Tap <strong>Add Expense</strong>.</Step>
          <Step number={2}>Enter the amount, a description (e.g., "Panel breakers from Home Depot"), and pick a category.</Step>
          <Step number={3}>Optionally snap a photo of the receipt.</Step>
          <Step number={4}>Set the date and tap <strong>Add Expense</strong>.</Step>
          <p className="text-gray-500 mt-1">The running total at the top shows total spend for the project. Receipt photos are stored with thumbnails for quick review.</p>
          <p className="text-gray-500"><strong>Categories:</strong> Materials, Rental, Permit Fee, Other.</p>
        </Section>

        {/* Inspections */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-8">Permits & Inspections</h3>

        <Section icon={ClipboardCheck} title="Tracking Inspections">
          <p>Open a project and scroll to the <strong>Inspections</strong> section to see all permits and inspections.</p>
          {isAdmin && (
            <>
              <Step number={1}>Tap <strong>Add Inspection</strong>.</Step>
              <Step number={2}>Select the type (Rough-in Inspection, Final Inspection, Permit Application, or Other).</Step>
              <Step number={3}>Set the status: <strong>Pending</strong>, <strong>Scheduled</strong>, <strong>Passed</strong>, or <strong>Failed</strong>.</Step>
              <Step number={4}>Add the scheduled date and any notes (inspector name, corrections needed, etc.).</Step>
            </>
          )}
          <p className="text-gray-500 mt-1">Status badges are color-coded: gray for pending, green for passed, red for failed. {isAdmin ? 'Update the status as inspections happen.' : 'Your admin manages inspection records.'}</p>
        </Section>

        {/* Admin Only */}
        {isAdmin && (
          <>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-8">Admin Tools</h3>

            <Section icon={CalendarDays} title="Crew Schedule">
              <p>Go to <strong>Schedule</strong> to see and manage the two-week crew schedule.</p>
              <p>The board shows the current week and next week, with crew members down the left and days across the top.</p>
              <Step number={1}>Tap an empty cell to assign a crew member to a project for that day.</Step>
              <Step number={2}>Tap a filled cell to change the assignment or clear it.</Step>
              <p className="text-gray-500 mt-1">Projects are color-coded so you can see the distribution at a glance. Today's column is highlighted in green. Each crew member can only be assigned to one project per day.</p>
            </Section>

            <Section icon={FileStack} title="Templates">
              <p>Templates define standard phases for different project types (e.g., "Residential New Build" with Rough-in, Trim-out, Final phases).</p>
              <Step number={1}>Go to <strong>Templates</strong> and tap <strong>+ New Template</strong>.</Step>
              <Step number={2}>Name the template and add phases in order.</Step>
              <Step number={3}>When creating a new project, select a template to auto-fill its phases.</Step>
            </Section>

            <Section icon={BarChart3} title="Time Reports">
              <p>Go to <strong>Reports</strong> to see time entries across all projects and workers.</p>
              <p>Filter by date range, project, or worker. The summary cards show total hours, number of entries, and how many workers logged time.</p>
              <p>Tap <strong>Export CSV</strong> to download a spreadsheet of the filtered data.</p>
            </Section>

            <Section icon={Users} title="Managing Users">
              <p>Go to <strong>Settings</strong> to see your team.</p>
              <p><strong>Invite crew members:</strong> Tap <strong>Copy Invite Link</strong> and send it to them. They'll create their own account.</p>
              <p><strong>Deactivate a user:</strong> Toggle the switch next to their name. They'll lose access immediately.</p>
            </Section>

            <Section icon={Bell} title="Push Notifications">
              <p>Get notified on your phone or desktop when crew activity happens.</p>
              <Step number={1}>Go to <strong>Settings</strong> and scroll to <strong>Notifications</strong>.</Step>
              <Step number={2}>Tap <strong>Enable Push Notifications</strong> and allow when your browser asks.</Step>
              <Step number={3}>Toggle each notification type on or off:</Step>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Clock In/Out</strong> — know when crew starts or stops work</li>
                <li><strong>Phase Complete</strong> — get alerted when a project phase is marked done</li>
                <li><strong>New Photo</strong> — see when crew uploads job site photos</li>
              </ul>
              <p className="text-gray-500 mt-1">Notifications are only sent to admin users. Turn off any type that's too noisy.</p>
            </Section>
          </>
        )}

        {/* Weather & Tips */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-8">Dashboard Features</h3>

        <Section icon={CloudSun} title="Weather Forecast">
          <p>The dashboard shows a <strong>3-day weather forecast</strong> for the Wilmington area.</p>
          <p>Rain and storm days are highlighted with a warning color so you can plan outdoor work accordingly.</p>
          <p className="text-gray-500">The forecast updates every hour automatically.</p>
        </Section>

        {/* Tips */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-8">Tips</h3>

        <Section icon={Smartphone} title="Install as an App">
          <p>On your phone, you can install Blue Shores PM as an app for quick access:</p>
          <p><strong>iPhone:</strong> In Safari, tap the share button (square with arrow) → <strong>Add to Home Screen</strong>.</p>
          <p><strong>Android:</strong> In Chrome, tap the menu (three dots) → <strong>Add to Home Screen</strong>.</p>
          <p>The app works even with spotty signal — actions queue up and sync when you're back online.</p>
        </Section>

        <Section icon={Download} title="Offline Mode">
          <p>If you lose signal on a job site, you can still:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Clock in and out</li>
            <li>Add notes</li>
            <li>Take photos</li>
          </ul>
          <p>Everything syncs automatically when your connection comes back. You'll see a status indicator showing sync progress.</p>
        </Section>

      </div>
    </div>
  )
}

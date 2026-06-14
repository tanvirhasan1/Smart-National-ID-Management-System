// Support Ticket Page Start
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  FaPlus,
  FaTimes,
  FaPaperPlane,
  FaSpinner,
  FaTicketAlt,
  FaComments,
  FaClock,
  FaCheckCircle,
  FaArrowRight
} from 'react-icons/fa';
import api from '../api/axios';
import Loader from '../common/Loader';
import { useLanguage } from '../context/LanguageContext';
import {
  formatDate,
  formatDateTime,
  formatStatus,
  getStatusColor
} from '../utils/helpers';
import '../styles/SupportTicket.css';

const SupportTicket = () => {
  // Main page state
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();
  const { getTranslation } = useLanguage();
  const copy = getTranslation('support');
  // Load all tickets on first render
  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async (shouldKeepSelection = true) => {
    try {
      setLoading(true);
      const response = await api.get('/support/my-tickets');
      const ticketList = response?.data?.data || [];

      setTickets(ticketList);

      if (!shouldKeepSelection && ticketList.length > 0) {
        handleSelectTicket(ticketList[0]._id);
        return;
      }

      if (
        selectedTicket?._id &&
        ticketList.some((ticket) => ticket._id === selectedTicket._id)
      ) {
        return;
      }

      if (!selectedTicket && ticketList.length > 0) {
        handleSelectTicket(ticketList[0]._id);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error(
        error?.response?.data?.message || copy.toasts?.loadFailed
      );
    } finally {
      setLoading(false);
    }
  };

  // Load a single ticket with full conversation
  const handleSelectTicket = async (ticketId) => {
    try {
      setDetailsLoading(true);
      const response = await api.get(`/support/tickets/${ticketId}`);
      const ticketDetails = response?.data?.data || null;
      setSelectedTicket(ticketDetails);
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast.error(
        error?.response?.data?.message || copy.toasts?.detailsFailed
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  // Create a new support ticket
  const handleCreateTicket = async (data) => {
    setIsSubmitting(true);

    try {
      const response = await api.post('/support/tickets', data);
      const createdTicket = response?.data?.data;

      toast.success(copy.toasts?.createSuccess);
      setShowCreateModal(false);
      reset();

      await fetchTickets(false);

      if (createdTicket?._id) {
        await handleSelectTicket(createdTicket._id);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.msg ||
        copy.toasts?.createFailed
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send reply to selected ticket without refreshing the whole page
  const handleSendMessage = async (event) => {
    event.preventDefault();

    const messageText = newMessage.trim();
    if (!messageText || !selectedTicket?._id) return;

    const ticketId = selectedTicket._id;
    const previousTicket = selectedTicket;
    const now = new Date().toISOString();
    const temporaryReplyId = `local-${Date.now()}`;

    const optimisticReply = {
      _id: temporaryReplyId,
      message: messageText,
      responderRole: 'citizen',
      createdAt: now
    };

    setSendingMessage(true);
    setNewMessage('');

    // Instant UI update: message appears immediately like a chat app.
    setSelectedTicket((currentTicket) => {
      if (!currentTicket || currentTicket._id !== ticketId) return currentTicket;

      return {
        ...currentTicket,
        updatedAt: now,
        responses: [...(currentTicket.responses || []), optimisticReply]
      };
    });

    setTickets((currentTickets) =>
      currentTickets.map((ticket) =>
        ticket._id === ticketId
          ? {
            ...ticket,
            updatedAt: now
          }
          : ticket
      )
    );

    try {
      const response = await api.post(`/support/tickets/${ticketId}/respond`, {
        message: messageText
      });

      const responseData = response?.data?.data;
      const serverTicket = responseData?.responses ? responseData : null;
      const serverReply =
        responseData?.response ||
        responseData?.reply ||
        response?.data?.response ||
        response?.data?.reply ||
        null;

      if (serverTicket) {
        setSelectedTicket(serverTicket);
        setTickets((currentTickets) =>
          currentTickets.map((ticket) =>
            ticket._id === ticketId
              ? {
                ...ticket,
                status: serverTicket.status || ticket.status,
                updatedAt: serverTicket.updatedAt || ticket.updatedAt
              }
              : ticket
          )
        );
      } else if (serverReply?.message) {
        setSelectedTicket((currentTicket) => {
          if (!currentTicket || currentTicket._id !== ticketId) return currentTicket;

          return {
            ...currentTicket,
            updatedAt: serverReply.createdAt || now,
            responses: (currentTicket.responses || []).map((reply) =>
              reply._id === temporaryReplyId ? serverReply : reply
            )
          };
        });
      }

      toast.success(copy.toasts?.messageSuccess);
    } catch (error) {
      setSelectedTicket(previousTicket);
      setNewMessage(messageText);
      setTickets((currentTickets) =>
        currentTickets.map((ticket) =>
          ticket._id === ticketId
            ? {
              ...ticket,
              updatedAt: previousTicket?.updatedAt || ticket.updatedAt
            }
            : ticket
        )
      );

      toast.error(
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.msg ||
        copy.toasts?.messageFailed
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <FaClock className="text-amber-500" />;
      case 'in_progress':
        return <FaComments className="text-sky-500" />;
      case 'resolved':
      case 'closed':
        return <FaCheckCircle className="text-green-600" />;
      default:
        return <FaClock className="text-gray-400" />;
    }
  };

  const getTranslatedStatus = (status) =>
    copy.statuses?.[status] || formatStatus(status);

  const getTranslatedCategory = (category) =>
    copy.categories?.[category] || formatStatus(category);

  const getTranslatedPriority = (priority) =>
    copy.priorities?.[priority] || formatStatus(priority);

  const renderTemplate = (template = '', variables = {}) =>
    Object.entries(variables).reduce(
      (text, [key, value]) => text.replaceAll(`{${key}}`, value),
      template
    );

  // Loading state
  if (loading) {
    return (
      <div className="support-loading-wrapper flex min-h-[60vh] items-center justify-center">
        <Loader size="large" text={copy.loadingTickets} />
      </div>
    );
  }

  return (
    <div className="support-page-wrapper min-h-[calc(100vh-140px)] bg-[#F9FAFB] px-4 py-8">
      <div className="support-page-shell mx-auto w-full max-w-[1200px]">
        {/* Page header */}
        <div className="support-header-panel mb-8 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)] md:flex-row md:items-center md:justify-between">
          <div className="support-header-content">
            <h1 className="support-page-title mb-1 text-[1.9rem] font-semibold text-[#1F2937]">
              {copy.title}
            </h1>
            <p className="support-page-subtitle text-[#6B7280]">
              {copy.subtitle}
            </p>
          </div>

          <button
            type="button"
            className="support-create-button inline-flex items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
            onClick={() => setShowCreateModal(true)}
          >
            <FaPlus />
            <span>{copy.createNewTicket}</span>
          </button>
        </div>

        {/* Main support area */}
        <div className="support-content-grid grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* Ticket list */}
          <div className="support-sidebar-panel rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            <div className="support-sidebar-header mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[#1F2937]">
                {copy.myTickets} ({tickets.length})
              </h3>
              <span className="rounded-full bg-[#F0FDF4] px-3 py-1 text-xs font-medium text-[#16A34A]">
                {copy.activeSupport}
              </span>
            </div>

            {tickets.length === 0 ? (
              <div className="support-empty-state rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-5 py-10 text-center">
                <FaTicketAlt className="mx-auto mb-4 text-4xl text-[#D1D5DB]" />
                <h4 className="mb-2 text-lg font-semibold text-[#374151]">
                  {copy.noTicketsTitle}
                </h4>
                <p className="mb-5 text-sm text-[#6B7280]">
                  {copy.noTicketsDescription}
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
                  onClick={() => setShowCreateModal(true)}
                >
                  <FaPlus />
                  <span>{copy.createTicket}</span>
                </button>
              </div>
            ) : (
              <div className="support-ticket-list flex flex-col gap-3">
                {tickets.map((ticket) => (
                  <button
                    key={ticket._id}
                    type="button"
                    className={`support-ticket-card text-left rounded-xl border p-4 transition ${selectedTicket?._id === ticket._id
                      ? 'border-[#16A34A] bg-[#F0FDF4]'
                      : 'border-[#E5E7EB] bg-white hover:border-[#16A34A]'
                      }`}
                    onClick={() => handleSelectTicket(ticket._id)}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span className="support-ticket-number text-sm font-semibold text-[#1F2937]">
                        #{ticket.ticketNumber}
                      </span>
                      <span>{getStatusIcon(ticket.status)}</span>
                    </div>

                    <h4 className="mb-2 line-clamp-2 text-sm font-semibold text-[#1F2937]">
                      {ticket.subject}
                    </h4>

                    <div className="mb-2">
                      <span
                        className={`badge badge-sm badge-${getStatusColor(ticket.status)}`}
                      >
                        {getTranslatedStatus(ticket.status)}
                      </span>
                    </div>

                    <p className="text-xs text-[#6B7280]">
                      {formatDate(ticket.createdAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ticket details and conversation */}
          <div className="support-details-panel rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] sm:p-6">
            {detailsLoading ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <Loader size="medium" text={copy.loadingDetails} />
              </div>
            ) : selectedTicket ? (
              <>
                <div className="support-details-header mb-6 border-b border-[#E5E7EB] pb-5">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="mb-1 text-2xl font-semibold text-[#1F2937]">
                        #{selectedTicket.ticketNumber}
                      </h2>
                      <p className="text-sm text-[#6B7280]">
                        {copy.category}: {getTranslatedCategory(selectedTicket.category)}
                      </p>
                    </div>

                    <span
                      className={`badge badge-${getStatusColor(selectedTicket.status)}`}
                    >
                      {getTranslatedStatus(selectedTicket.status)}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-[#F9FAFB] p-4">
                      <p className="mb-1 text-sm text-[#6B7280]">{copy.subject}</p>
                      <p className="font-semibold text-[#1F2937]">
                        {selectedTicket.subject}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F9FAFB] p-4">
                      <p className="mb-1 text-sm text-[#6B7280]">{copy.created}</p>
                      <p className="font-semibold text-[#1F2937]">
                        {formatDateTime(selectedTicket.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="support-conversation-section">
                  <h3 className="mb-4 text-lg font-semibold text-[#1F2937]">
                    {copy.conversation}
                  </h3>

                  <div className="support-messages-list mb-6 flex flex-col gap-4">
                    <div className="support-message-item support-message-user max-w-[85%] rounded-2xl bg-[#F0FDF4] px-4 py-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[#16A34A]">
                          You
                        </span>
                        <span className="text-xs text-[#6B7280]">
                          {formatDateTime(selectedTicket.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm leading-7 text-[#1F2937]">
                        {selectedTicket.description}
                      </p>
                    </div>

                    {selectedTicket.responses?.map((response, index) => {
                      const isAdmin =
                        response.responderRole === 'admin' ||
                        response.responderRole === 'super_admin';

                      return (
                        <div
                          key={`${response.createdAt}-${index}`}
                          className={`support-message-item max-w-[85%] rounded-2xl px-4 py-4 ${isAdmin
                            ? 'support-message-admin ml-auto bg-[#EFF6FF]'
                            : 'support-message-user bg-[#F0FDF4]'
                            }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span
                              className={`text-sm font-semibold ${isAdmin ? 'text-sky-600' : 'text-[#16A34A]'
                                }`}
                            >
                              {isAdmin ? copy.supportTeam : copy.you}
                            </span>
                            <span className="text-xs text-[#6B7280]">
                              {formatDateTime(response.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm leading-7 text-[#1F2937]">
                            {response.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {!['resolved', 'closed'].includes(selectedTicket.status) ? (
                    <form
                      className="support-reply-form rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                      onSubmit={handleSendMessage}
                    >
                      <label className="mb-2 block text-sm font-medium text-[#374151]">
                        {copy.replyMessage}
                      </label>
                      <textarea
                        rows={4}
                        value={newMessage}
                        onChange={(event) => setNewMessage(event.target.value)}
                        placeholder={copy.replyPlaceholder}
                        className="support-reply-input w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
                      />
                      <div className="mt-4 flex justify-end">
                        <button
                          type="submit"
                          className="support-send-button inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={sendingMessage || !newMessage.trim()}
                        >
                          {sendingMessage ? (
                            <>
                              <FaSpinner className="animate-spin" />
                              <span>{copy.sending}</span>
                            </>
                          ) : (
                            <>
                              <FaPaperPlane />
                              <span>{copy.sendMessage}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="support-closed-note rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-5 text-center">
                      <p className="text-sm text-[#6B7280]">
                        {renderTemplate(copy.closedNote, {
                          status: getTranslatedStatus(selectedTicket.status)
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="support-no-selection flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 text-center">
                <FaComments className="mb-4 text-5xl text-[#D1D5DB]" />
                <h3 className="mb-2 text-xl font-semibold text-[#374151]">
                  {copy.selectTicketTitle}
                </h3>
                <p className="mb-5 max-w-[420px] text-[#6B7280]">
                  {copy.selectTicketDescription}
                </p>
                {tickets.length > 0 && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
                    onClick={() => handleSelectTicket(tickets[0]._id)}
                  >
                    <span>{copy.openFirstTicket}</span>
                    <FaArrowRight />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create ticket modal */}
        {showCreateModal && (
          <div
            className="support-modal-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm sm:px-6"
            onClick={() => setShowCreateModal(false)}
          >
            <div
              className="support-modal-card w-full max-w-[640px] max-h-[calc(100dvh-48px)] overflow-hidden rounded-[24px] bg-white shadow-[0_28px_85px_rgba(15,23,42,0.30)] ring-1 ring-slate-200/80"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-400" />
              <div className="support-modal-header flex items-start justify-between gap-4 border-b border-[#E5E7EB] bg-white px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
                    <FaTicketAlt className="text-lg" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold leading-tight text-[#1F2937]">
                      {copy.modalTitle}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[#6B7280]">
                      {copy.modalSubtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="support-modal-close flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white p-0 text-[#6B7280] shadow-sm transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:text-[#111827]"
                  onClick={() => setShowCreateModal(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit(handleCreateTicket)}>
                <div className="support-modal-body max-h-[calc(100dvh-220px)] space-y-5 overflow-y-auto px-6 py-6">
                  <div className="form-group">
                    <label className="mb-2 block text-sm font-medium text-[#374151]">
                      {copy.subjectLabel}
                    </label>
                    <input
                      type="text"
                      className={`w-full rounded-lg border bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:ring-4 ${errors.subject
                        ? 'border-red-600 focus:border-red-600 focus:ring-red-600/10'
                        : 'border-[#D1D5DB] focus:border-[#16A34A] focus:ring-[#16A34A]/10'
                        }`}
                      placeholder={copy.subjectPlaceholder}
                      {...register('subject', { required: copy.validation?.subjectRequired })}
                    />
                    {errors.subject && (
                      <span className="mt-2 block text-sm text-red-600">
                        {errors.subject.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="mb-2 block text-sm font-medium text-[#374151]">
                      {copy.categoryLabel}
                    </label>
                    <select
                      className={`w-full rounded-lg border bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:ring-4 ${errors.category
                        ? 'border-red-600 focus:border-red-600 focus:ring-red-600/10'
                        : 'border-[#D1D5DB] focus:border-[#16A34A] focus:ring-[#16A34A]/10'
                        }`}
                      {...register('category', { required: copy.validation?.categoryRequired })}
                    >
                      <option value="">{copy.selectCategory}</option>
                      <option value="application_issue">{copy.categories?.application_issue}</option>
                      <option value="appointment">{copy.categories?.appointment}</option>
                      <option value="payment">{copy.categories?.payment}</option>
                      <option value="delivery">{copy.categories?.delivery}</option>
                      <option value="technical">{copy.categories?.technical}</option>
                      <option value="other">{copy.categories?.other}</option>
                    </select>
                    {errors.category && (
                      <span className="mt-2 block text-sm text-red-600">
                        {errors.category.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="mb-2 block text-sm font-medium text-[#374151]">
                      {copy.priorityLabel}
                    </label>
                    <select
                      className="w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
                      {...register('priority')}
                      defaultValue="medium"
                    >
                      <option value="low">{copy.priorities?.low}</option>
                      <option value="medium">{copy.priorities?.medium}</option>
                      <option value="high">{copy.priorities?.high}</option>
                      <option value="urgent">{copy.priorities?.urgent}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="mb-2 block text-sm font-medium text-[#374151]">
                      {copy.descriptionLabel}
                    </label>
                    <textarea
                      rows={5}
                      className={`w-full rounded-lg border bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:ring-4 ${errors.description
                        ? 'border-red-600 focus:border-red-600 focus:ring-red-600/10'
                        : 'border-[#D1D5DB] focus:border-[#16A34A] focus:ring-[#16A34A]/10'
                        }`}
                      placeholder={copy.descriptionPlaceholder}
                      {...register('description', {
                        required: copy.validation?.descriptionRequired,
                        minLength: {
                          value: 20,
                          message: copy.validation?.descriptionMin
                        }
                      })}
                    />
                    {errors.description && (
                      <span className="mt-2 block text-sm text-red-600">
                        {errors.description.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="support-modal-footer flex flex-col gap-3 border-t border-[#E5E7EB] bg-white/95 px-6 py-5 backdrop-blur sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-semibold text-[#374151] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                    onClick={() => setShowCreateModal(false)}
                  >
                    {copy.cancel}
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/20 transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>{copy.creating}</span>
                      </>
                    ) : (
                      copy.createTicket
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportTicket;
// Support Ticket Page End

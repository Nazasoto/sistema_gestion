import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TicketService from '../../services/ticket.service';

const TicketDetail = () => {
  const { id } = useParams();
  const [ticket, setTicket] = useState({});

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await TicketService.getTicketById(id);
        setTicket(response);
      } catch (error) {
        console.error(`Error al obtener el ticket con ID ${id}:`, error);
      }
    };

    fetchTicket();
  }, [id]);

  return (
    <div className="ticket-detail">
      <h2>Detalles del Ticket #{id}</h2>
      <div className="ticket-info">
        <p>
          <strong>Título:</strong> {ticket.titulo || '-'}
        </p>
        <p>
          <strong>Descripción:</strong> {ticket.descripcion || '-'}
        </p>
        <p>
          <strong>Estado:</strong> {ticket.estado || '-'}
        </p>
        <p>
          <strong>Urgencia:</strong> {ticket.urgencia || '-'}
        </p>
        <p>
          <strong>Asignado a (ID):</strong> {ticket.asignadoA ?? '-'}
        </p>
        <p>
          <strong>Fecha de creación:</strong> {ticket.fechaCreacion ? new Date(ticket.fechaCreacion).toLocaleString('es-AR') : '-'}
        </p>
        <p>
          <strong>Última actualización:</strong> {ticket.fechaActualizacion ? new Date(ticket.fechaActualizacion).toLocaleString('es-AR') : '-'}
        </p>
      </div>
    </div>
  );
};

export default TicketDetail;

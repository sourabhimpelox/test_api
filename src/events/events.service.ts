import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './event.entity';
import { CreateEventDto } from './dto/create-event.dto'; 
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async createEvent(eventData: CreateEventDto): Promise<Event> {
    try {
      const event = this.eventRepository.create(eventData);
      return await this.eventRepository.save(event);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create event');
    }
  }

  async getAllEvents(): Promise<Event[]> {
    try {
      return await this.eventRepository.find();
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve events');
    }
  }

  async getEventById(id: number): Promise<Event> {
    try {
      const event = await this.eventRepository.findOne({ where: { id } });
      if (!event) {
        throw new NotFoundException(`Event with ID ${id} not found`);
      }
      return event;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve event');
    }
  }

  async updateEvent(id: number, updateData: UpdateEventDto): Promise<Event> {
    try {
      const event = await this.getEventById(id); // Reuse getEventById to check existence
      Object.assign(event, updateData);
      return await this.eventRepository.save(event);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update event');
    }
  }

  async deleteEvent(id: number): Promise<void> {
    try {
      const event = await this.getEventById(id); // Reuse getEventById to check existence
      await this.eventRepository.remove(event);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete event');
    }
  }
}




import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { IncomeSource } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {

    const user = await getAuthenticatedUser();

    if(!user) {
        return NextResponse.json(
            { error: 'Unauthorised' },
            { status: 401 }
        )
    }

    const selectedMonth = req.nextUrl.searchParams.get("month");
    if (!selectedMonth) {
      return NextResponse.json(
        { error: "[income API] - Missing required field: month" },
        { status: 400 }
      );
    }

    const frontStartDateString = `${selectedMonth}-01`;
    const frontStartDate = new Date(frontStartDateString);

    const year = +selectedMonth.substring(0, 4);
    const month = +selectedMonth.substring(5, 7);
    const frontEndDate = new Date(year, month, 0);

    const income = await prisma.incomeSource.findMany({
      where: {
        userId: user.id,
        startDate: { lte: frontEndDate },
        OR: [
          { endDate: { gte: frontStartDate } },
          { endDate: null }
        ]
      }
    });

    return NextResponse.json(income);
  } catch (e) {
    console.log(`error:`, e);
    return NextResponse.json(
      { error: "[income API] - Failed to fetch income" },
      { status: 500 }
    );
  }
}

function isValidType(field: unknown, expectedType: string): boolean {
  return typeof field === expectedType;
}

export async function POST(req: Request) {
    try{
        const user = await getAuthenticatedUser();
        if(!user) {
            return NextResponse.json(
                { error: 'Unauthorised' },
                { status: 401 }
            )
        }

        const body = await req.json();

        const { name, amount, icon, type, startDate, endDate, note } = body;

        if (!isValidType(name, 'string')) return NextResponse.json({ error: 'name must be a string' }, { status: 400 });
        if (!isValidType(amount, 'number')) return NextResponse.json({ error: 'amount field type not correct, should be of type number'}, { status: 400 });

        // empty validation
        if(!name) return NextResponse.json({ error: 'Required field name is required'}, {status: 400});
        if(amount == undefined || amount == null || amount < 0) return NextResponse.json({ error: 'Amount field value received is not correct'}, {status: 400});
        if(!icon) return NextResponse.json({ error: 'Required field icon is required'}, {status: 400});
        if(!type || type !== 'active' && type !== 'passive') return NextResponse.json({ error: 'Required field type value received is not correct'}, {status: 400});


        if (!startDate) {
            return NextResponse.json({ error: 'Required field startDate is missing' }, { status: 400 });
        }

        const parsedDate = new Date(startDate);
        if (isNaN(parsedDate.getTime())) {
            return NextResponse.json({ error: 'startDate is not a valid date' }, { status: 400 });
        }

        if(name.length > 100) return NextResponse.json({ error: 'name field is too long, maximum 100 characters allowed'}, { status: 400});
        if(note){
            if(note.length > 500) return NextResponse.json({ error: 'note field is too long, maximum 500 characters allowed'}, { status: 400});
        }
        if(amount > 1000000000000) return NextResponse.json({ error: 'max amount bound reached'}, { status: 400 });


        const income = await prisma.incomeSource.create({
            data: {
                userId: user.id,
                name: name,
                amount: amount,
                icon: icon,
                startDate: startDate,
                endDate: endDate,
                note: note,
                type: type
            }
        });

        return NextResponse.json(income, { status: 201 });

    } catch (e) {
        console.log(e);
        return NextResponse.json(
            { error: '[income api] - failed to post income' },
            { status: 500 }
        )
    }
}

export async function PUT(req: Request) {

    try{
        const user = await getAuthenticatedUser();
        if(!user) {
            return NextResponse.json(
                { error: 'Unauthorised' },
                { status: 401 }
            )
        }

        const body = await req.json();

        const { id, name, amount, icon, type, startDate, endDate, note } = body;

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const data: Partial<IncomeSource> = {};

        if(name !== undefined && name !== '') data.name = name;
        if(amount !== undefined && amount >= 0) data.amount = amount;
        if(icon !== undefined && icon !== '') data.icon = icon;
        if(type !== undefined && (type == 'active' || type == 'passive')) data.type = type;
        if(startDate !== undefined && new Date(startDate)) data.startDate = startDate;
        if(endDate !== undefined && new Date(endDate)) data.endDate = endDate;
        if(note !== undefined && note !== '') data.note = note;

        const income = await prisma.incomeSource.update({
            where: { 
                id: id,
                userId: user.id
            },
            data: data
        });

        return NextResponse.json(income);

    } catch (e) {
        console.log(e);
        if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') return NextResponse.json({ error: 'Income source not found' }, { status: 404 });
        else return NextResponse.json({ error: '[income api] - failed to update income' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    
    try{
        
        const user = await getAuthenticatedUser();
        
        if(!user) {
            return NextResponse.json(
                { error: 'Unauthorised' },
                { status: 401 }
            )
        }

        const body = await req.json();

        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        await prisma.incomeSource.delete({
            where: {
                id: id,
                userId: user.id
            }
        });

        return new NextResponse(null, { status: 204 });

    } catch (e) {
        console.log(e);
        if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') return NextResponse.json({ error: 'Income source not found' }, { status: 404 });
        else return NextResponse.json({ error: '[income api] - failed to delete income' }, { status: 500 });
    }
}